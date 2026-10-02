// Sends a request card (and attached photos) to the team's Telegram group via the Bot API.
// Runs only on the server: the bot token must never reach the browser.

const API = 'https://api.telegram.org'
const PHOTO_TYPES = /^image\/(jpeg|png|webp)$/
const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // Telegram limit for sendPhoto
const MAX_GROUP_SIZE = 10 // Telegram limit for sendMediaGroup

const METHOD_LABELS = { whatsapp: 'WhatsApp', telegram: 'Telegram', viber: 'Viber', phone: 'Звонок' }
const PREFERENCE_LABELS = { original: 'оригинал', analog: 'аналог', used: 'б/у' }

const escapeHtml = value =>
	String(value ?? '').replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])

// Georgian mobiles are often typed without the country code: 5XX XX XX XX → 9955XXXXXXXX
export function normalizePhone(value) {
	let digits = String(value ?? '').replace(/\D/g, '').replace(/^00/, '')
	if (digits.length === 9 && digits.startsWith('5')) digits = `995${digits}`
	return digits
}

export function buildCard(request) {
	const lines = [
		`<b>🆕 Заявка № ${escapeHtml(request.id)}</b>`,
		'',
		request.vin ? `🚗 VIN: <code>${escapeHtml(request.vin)}</code>` : '🚗 VIN: <i>не указан — см. «Авто»</i>',
		`🔧 ${escapeHtml(request.part)}`,
		`☎️ ${METHOD_LABELS[request.contactMethod] ?? 'Контакт'}: ${escapeHtml(request.contact)}`,
	]

	const details = [
		request.car && `Авто: ${escapeHtml(request.car)}`,
		request.partNumber && `Номер детали: <code>${escapeHtml(request.partNumber)}</code>`,
		PREFERENCE_LABELS[request.preference] && `Вариант: ${PREFERENCE_LABELS[request.preference]}`,
		request.name && `Имя: ${escapeHtml(request.name)}`,
	].filter(Boolean)
	if (details.length) lines.push('', ...details)

	const files = request.files.length ? `файлов: ${request.files.length}` : 'без фото'
	lines.push('', `<i>${escapeHtml((request.lang || '').toUpperCase())} · ${files}</i>`)
	return lines.join('\n')
}

// URL button to open a chat with the client. Telegram buttons accept only http(s)/tg links,
// so Viber / phone have no button — the number in the card text is tappable anyway.
export function contactButton(method, contact) {
	const phone = normalizePhone(contact)
	if (method === 'whatsapp' && phone) {
		return { text: 'Написать в WhatsApp', url: `https://wa.me/${phone}` }
	}
	if (method === 'telegram') {
		const username = String(contact).trim().replace(/^@/, '')
		if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username)) return { text: 'Написать в Telegram', url: `https://t.me/${username}` }
		if (phone) return { text: 'Написать в Telegram', url: `https://t.me/+${phone}` }
	}
	return null
}

async function callApi(token, method, payload) {
	const isMultipart = payload instanceof FormData
	const response = await fetch(`${API}/bot${token}/${method}`, {
		method: 'POST',
		body: isMultipart ? payload : JSON.stringify(payload),
		headers: isMultipart ? undefined : { 'content-type': 'application/json' },
	})
	const data = await response.json().catch(() => ({}))
	if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || response.status}`)
	return data.result
}

const chunk = (items, size) =>
	Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size))

// Photos and documents can't be mixed in one album, so they go as separate albums
async function sendFiles(token, chatId, replyTo, files, type) {
	for (const group of chunk(files, MAX_GROUP_SIZE)) {
		const form = new FormData()
		form.append('chat_id', chatId)
		form.append('reply_parameters', JSON.stringify({ message_id: replyTo }))

		if (group.length === 1) {
			const [{ file, caption }] = group
			form.append(type, file, file.name)
			form.append('caption', caption)
			await callApi(token, type === 'photo' ? 'sendPhoto' : 'sendDocument', form)
			continue
		}

		const media = group.map(({ caption }, i) => ({ type, media: `attach://file${i}`, caption }))
		group.forEach(({ file }, i) => form.append(`file${i}`, file, file.name))
		form.append('media', JSON.stringify(media))
		await callApi(token, 'sendMediaGroup', form)
	}
}

export async function sendToTelegram({ token, chatId }, request) {
	const button = contactButton(request.contactMethod, request.contact)
	const card = await callApi(token, 'sendMessage', {
		chat_id: chatId,
		text: buildCard(request),
		parse_mode: 'HTML',
		link_preview_options: { is_disabled: true },
		...(button && { reply_markup: { inline_keyboard: [[button]] } }),
	})

	const files = request.files.map(({ file, label }) => ({ file, caption: `№ ${request.id} · ${label}` }))
	const isPhoto = ({ file }) => PHOTO_TYPES.test(file.type) && file.size <= MAX_PHOTO_BYTES
	await sendFiles(token, chatId, card.message_id, files.filter(isPhoto), 'photo')
	await sendFiles(token, chatId, card.message_id, files.filter(f => !isPhoto(f)), 'document')
}
