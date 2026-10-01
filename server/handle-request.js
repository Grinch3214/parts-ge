// The request endpoint logic, shared by the Netlify Function (production) and the
// Vite dev/preview middleware (local). Works on standard Web Request/FormData.
//
// Contract with the frontend (src/js/modules/request-form.js):
//   POST multipart/form-data
//   200 { ok: true, id }                  accepted
//   422 { ok: false, errors: { field } }  validation failed (codes = keys of form.errors in i18n)
//   413 { ok: false, error: 'filesTooLarge' }
//   429 { ok: false, error: 'rateLimit' }
//   5xx { ok: false, error: 'server' }

import {
	normalizeVin, validateVin, validatePart, validateContact, isAcceptedFile,
	MAX_FILE_SIZE, MAX_PART_PHOTOS, MAX_UPLOAD_BYTES,
} from '../src/js/modules/validation.js'
import { sendToTelegram } from './telegram.js'

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX_REQUESTS = 5
const MIN_FILL_TIME_MS = 2000
const METHODS = ['whatsapp', 'telegram', 'viber', 'phone']
const PREFERENCES = ['any', 'original', 'analog', 'used']

// Best-effort limiter: memory lives as long as the function instance is warm.
// Turnstile is the main protection against bots.
const hitsByIp = new Map()

// Short, human-friendly number: DDMM-XXX in Tbilisi time, e.g. "0110-347"
export function createRequestId(date = new Date()) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tbilisi', day: '2-digit', month: '2-digit' })
			.formatToParts(date)
			.map(({ type, value }) => [type, value])
	)
	const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
	return `${parts.day}${parts.month}-${random}`
}

async function verifyTurnstile(secret, token, ip) {
	if (!token) return false
	const body = new URLSearchParams({ secret, response: token })
	if (ip) body.append('remoteip', ip)
	try {
		const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
		return (await response.json()).success === true
	} catch {
		return false
	}
}

const reply = (status, body) => ({ status, body })

/**
 * @param {Request} request
 * @param {{ env?: object, ip?: string, allowLogOnly?: boolean, log?: Console }} options
 *   allowLogOnly — when Telegram isn't configured, accept and just log (local dev only)
 */
export async function handleRequest(request, { env = {}, ip = 'unknown', allowLogOnly = false, log = console } = {}) {
	if (request.method !== 'POST') return reply(405, { ok: false, error: 'server' })

	const now = Date.now()
	const recent = (hitsByIp.get(ip) || []).filter(time => now - time < RATE_WINDOW_MS)
	if (recent.length >= RATE_MAX_REQUESTS) return reply(429, { ok: false, error: 'rateLimit' })

	const length = Number(request.headers.get('content-length'))
	if (length > MAX_UPLOAD_BYTES + 512 * 1024) return reply(413, { ok: false, error: 'filesTooLarge' })

	let form
	try {
		form = await request.formData()
	} catch {
		return reply(400, { ok: false, error: 'server' })
	}
	const text = (name, max = 200) => String(form.get(name) ?? '').trim().slice(0, max)

	// Honeypot filled or submitted inhumanly fast: pretend success, drop silently
	if (text('website') || now - Number(text('_t')) < MIN_FILL_TIME_MS) {
		return reply(200, { ok: true, id: createRequestId() })
	}

	if (env.TURNSTILE_SECRET_KEY) {
		const passed = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, text('cf-turnstile-response', 4096), ip)
		if (!passed) return reply(403, { ok: false, error: 'server' })
	}

	const data = {
		vin: normalizeVin(text('vin', 40)),
		part: text('part', 1000),
		contactMethod: METHODS.includes(text('contactMethod')) ? text('contactMethod') : 'whatsapp',
		contact: text('contact', 100),
		car: text('car'),
		partNumber: text('partNumber', 100),
		preference: PREFERENCES.includes(text('preference')) ? text('preference') : 'any',
		name: text('name', 100),
		lang: text('lang', 5),
	}

	const isValidFile = file => file instanceof File && file.size > 0 && file.size <= MAX_FILE_SIZE && isAcceptedFile(file)
	const partPhotos = form.getAll('partPhotos').filter(isValidFile).slice(0, MAX_PART_PHOTOS)

	const errors = {}
	const vinError = validateVin(data.vin)
	if (vinError) errors.vin = vinError
	const partError = validatePart(data.part)
	if (partError) errors.part = partError
	const contactError = validateContact(data.contactMethod, data.contact)
	if (contactError) errors.contact = contactError
	if (Object.keys(errors).length) return reply(422, { ok: false, errors })

	recent.push(now)
	hitsByIp.set(ip, recent)

	const id = createRequestId()
	const files = partPhotos.map(file => ({ file, label: 'деталь' }))
	const payload = { id, ...data, files }

	if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
		if (!allowLogOnly) {
			log.error('[request] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set — request NOT delivered')
			return reply(500, { ok: false, error: 'server' })
		}
		log.info(`\n[request] Заявка №${id} (Telegram не настроен — только лог)`, { ...data, files: files.length })
		return reply(200, { ok: true, id })
	}

	try {
		await sendToTelegram({ token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID }, payload)
	} catch (error) {
		log.error(`[request] Заявка №${id}: не удалось отправить в Telegram —`, error.message)
		return reply(502, { ok: false, error: 'server' })
	}

	log.info(`[request] Заявка №${id} отправлена в Telegram`)
	return reply(200, { ok: true, id })
}
