// /api/request for `vite dev` / `vite preview` — runs the same handler as production
// (server/handle-request.js). Without TELEGRAM_* vars in .env.local it only logs requests;
// with them it sends real cards to Telegram, so the bot can be tested before deploying.

import { Readable } from 'node:stream'
import { handleRequest } from './handle-request.js'

export default function mockApi(env = {}) {
	async function middleware(req, res, next) {
		if (req.url?.split('?')[0] !== '/api/request') return next()

		const request = new Request('http://localhost/api/request', {
			method: req.method,
			headers: Object.fromEntries(
				Object.entries(req.headers).filter(([, value]) => typeof value === 'string')
			),
			body: req.method === 'POST' ? Readable.toWeb(req) : undefined,
			duplex: 'half',
		})

		const { status, body } = await handleRequest(request, {
			env,
			ip: req.socket.remoteAddress || 'local',
			allowLogOnly: true,
		})

		// Make the loading state visible when nothing real is being sent
		if (!env.TELEGRAM_BOT_TOKEN) await new Promise(resolve => setTimeout(resolve, 700))

		res.statusCode = status
		res.setHeader('content-type', 'application/json; charset=utf-8')
		res.end(JSON.stringify(body))
	}

	return {
		name: 'mock-api',
		configureServer(server) {
			server.middlewares.use(middleware)
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware)
		},
	}
}
