// Cloudflare Pages Function: Telegram calls POST /api/telegram-webhook when someone presses
// a button under a request card. Registered with `npm run tg:webhook -- https://batumiparts.ge`.
import { handleTelegramUpdate } from '../../server/telegram-webhook.js'

export async function onRequestPost({ request, env }) {
	const secret = env.TELEGRAM_WEBHOOK_SECRET
	if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
		return new Response('forbidden', { status: 403 })
	}

	try {
		await handleTelegramUpdate(await request.json(), { env })
	} catch (error) {
		console.error('[telegram-webhook]', error.message)
	}
	// Always 200 for valid calls, otherwise Telegram keeps retrying the same update
	return new Response('ok')
}
