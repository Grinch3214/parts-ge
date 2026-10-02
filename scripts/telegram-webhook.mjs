// Registers (or removes) the Telegram webhook for card buttons.
//   npm run tg:webhook -- https://batumiparts.netlify.app   → set
//   npm run tg:webhook -- --delete                          → remove (needed for `npm run tg:chat-id`)
//   npm run tg:webhook                                      → show current state
import crypto from 'node:crypto'

const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const arg = process.argv[2]
const api = (method, body) =>
	fetch(`https://api.telegram.org/bot${token}/${method}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body ?? {}),
	}).then(r => r.json())

if (!token) {
	console.error('Нет TELEGRAM_BOT_TOKEN в .env.local')
	process.exit(1)
}

if (arg === '--delete') {
	const result = await api('deleteWebhook')
	console.log(result.ok ? 'Webhook удалён.' : result.description)
} else if (arg) {
	if (!secret) {
		console.error('Нет TELEGRAM_WEBHOOK_SECRET в .env.local. Например:')
		console.error(`TELEGRAM_WEBHOOK_SECRET=${crypto.randomBytes(24).toString('hex')}`)
		console.error('Тот же секрет добавьте в переменные Netlify и сделайте redeploy.')
		process.exit(1)
	}
	const url = `${arg.replace(/\/$/, '')}/api/telegram-webhook`
	const result = await api('setWebhook', {
		url,
		secret_token: secret,
		allowed_updates: ['callback_query'],
		drop_pending_updates: true,
	})
	console.log(result.ok ? `Webhook установлен: ${url}` : result.description)
}

const info = await api('getWebhookInfo')
const { url, pending_update_count, last_error_message } = info.result ?? {}
console.log(`Сейчас: ${url || 'webhook не задан'}${pending_update_count ? ` · в очереди: ${pending_update_count}` : ''}${last_error_message ? ` · последняя ошибка: ${last_error_message}` : ''}`)
