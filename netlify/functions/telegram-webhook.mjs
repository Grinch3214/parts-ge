// Netlify Function: Telegram calls POST /api/telegram-webhook when someone presses a button
// under a request card. Registered once with `npm run tg:webhook -- https://<site>`.
// TELEGRAM_WEBHOOK_SECRET must match the secret_token given to setWebhook — requests without it are rejected.
import { handleTelegramUpdate } from '../../server/telegram-webhook.js'

export default async request => {
	const secret = process.env.TELEGRAM_WEBHOOK_SECRET
	if (request.method !== 'POST' || !secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
		return new Response('forbidden', { status: 403 })
	}

	try {
		await handleTelegramUpdate(await request.json(), { env: process.env })
	} catch (error) {
		console.error('[telegram-webhook]', error.message)
	}
	// Always 200 for valid calls, otherwise Telegram keeps retrying the same update
	return new Response('ok')
}

export const config = { path: '/api/telegram-webhook' }
