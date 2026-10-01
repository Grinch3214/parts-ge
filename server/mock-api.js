// Local stand-in for the real endpoint (Website → server endpoint → Telegram Bot → group).
// Runs only inside `vite dev` / `vite preview`. It implements the same contract the
// production endpoint must follow, so the frontend will not change when it is replaced:
//   POST /api/request  (multipart/form-data)
//   200 { ok: true, id }                 — accepted
//   422 { ok: false, errors: { field } } — validation failed
//   429 { ok: false, error: 'rateLimit' }
// The Telegram bot token must live only in the production endpoint's secrets, never in /src.

import { Readable } from 'node:stream'
import { normalizeVin, validateVin, validateContact, validatePart } from '../src/js/modules/validation.js'

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX_REQUESTS = 5
const MIN_FILL_TIME_MS = 2000

export default function mockApi() {
	const hitsByIp = new Map()
	let lastId = 1000

	async function handler(req, res, next) {
		if (req.url?.split('?')[0] !== '/api/request') return next()
		if (req.method !== 'POST') return send(res, 405, { ok: false })

		const ip = req.socket.remoteAddress || 'local'
		const now = Date.now()
		const recent = (hitsByIp.get(ip) || []).filter(time => now - time < RATE_WINDOW_MS)
		if (recent.length >= RATE_MAX_REQUESTS) return send(res, 429, { ok: false, error: 'rateLimit' })

		let form
		try {
			form = await new Request('http://localhost/api/request', {
				method: 'POST',
				headers: { 'content-type': req.headers['content-type'] || '' },
				body: Readable.toWeb(req),
				duplex: 'half',
			}).formData()
		} catch {
			return send(res, 400, { ok: false, error: 'server' })
		}

		// Honeypot or inhumanly fast submit: pretend success, drop silently
		if (form.get('website') || now - Number(form.get('_t')) < MIN_FILL_TIME_MS) {
			return send(res, 200, { ok: true, id: ++lastId })
		}

		const errors = {}
		if (form.get('mode') === 'photo') {
			if (!(form.get('docPhoto') instanceof File)) errors.docPhoto = 'photoRequired'
		} else {
			const vinError = validateVin(normalizeVin(form.get('vin')))
			if (vinError) errors.vin = vinError
		}
		const partError = validatePart(form.get('part'))
		if (partError) errors.part = partError
		const contactError = validateContact(form.get('contactMethod'), form.get('contact'))
		if (contactError) errors.contact = contactError
		if (Object.keys(errors).length) return send(res, 422, { ok: false, errors })

		recent.push(now)
		hitsByIp.set(ip, recent)
		const id = ++lastId

		console.info(`\n[mock-api] Заявка №${id}`, {
			lang: form.get('lang'),
			mode: form.get('mode'),
			vin: form.get('vin') || '—',
			part: form.get('part'),
			contact: `${form.get('contactMethod')}: ${form.get('contact')}`,
			car: form.get('car') || '—',
			partNumber: form.get('partNumber') || '—',
			preference: form.get('preference'),
			name: form.get('name') || '—',
			files: form.getAll('partPhotos').length + (form.get('docPhoto') ? 1 : 0),
		})

		await new Promise(resolve => setTimeout(resolve, 700))
		send(res, 200, { ok: true, id })
	}

	return {
		name: 'mock-api',
		configureServer(server) {
			server.middlewares.use(handler)
		},
		configurePreviewServer(server) {
			server.middlewares.use(handler)
		},
	}
}

function send(res, status, body) {
	res.statusCode = status
	res.setHeader('content-type', 'application/json; charset=utf-8')
	res.end(JSON.stringify(body))
}
