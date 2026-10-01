// Netlify Function: POST /api/request → validation → Telegram group.
// Secrets (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TURNSTILE_SECRET_KEY) are set in
// Netlify → Site configuration → Environment variables, never in the repository.
import { handleRequest } from '../../server/handle-request.js'

export default async (request, context) => {
	const { status, body } = await handleRequest(request, { env: process.env, ip: context.ip })
	return Response.json(body, { status })
}

export const config = { path: '/api/request' }
