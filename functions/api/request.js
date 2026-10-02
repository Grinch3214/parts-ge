// Cloudflare Pages Function: POST /api/request → validation → Telegram group.
// Same logic as the Netlify version (server/handle-request.js); only the wrapper differs.
// Secrets (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TURNSTILE_SECRET_KEY) come from
// Pages project → Settings → Variables and Secrets — never from the repository.
import { handleRequest } from '../../server/handle-request.js'

export async function onRequestPost({ request, env }) {
	const { status, body } = await handleRequest(request, {
		env,
		ip: request.headers.get('CF-Connecting-IP') || 'unknown',
	})
	return Response.json(body, { status })
}
