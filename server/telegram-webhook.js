// Handles button presses under request cards in the Telegram group ("Взял в работу" etc.).
// Stateless: the status lives in the card itself — the last line of its text — so no database.
//
// Telegram → POST /api/telegram-webhook (netlify/functions/telegram-webhook.mjs) → here.
import { callApi, cardKeyboard } from './telegram.js'

const ACTIONS = {
	take: { status: 'taken', mark: '🟡', label: 'в работе', toast: 'Заявка взята в работу' },
	done: { status: 'done', mark: '✅', label: 'обработана', toast: 'Заявка отмечена как обработанная' },
	reset: { status: 'new', toast: 'Статус снят' },
}

// The status line we append: "\n\n🟡 Статус: в работе — @max · 14:32"
const STATUS_LINE = /\n\n(?:🟡|✅) Статус: [^\n]*$/

const tbilisiTime = date =>
	new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tbilisi', hour: '2-digit', minute: '2-digit' }).format(date)

const displayName = user =>
	user.username ? `@${user.username}` : [user.first_name, user.last_name].filter(Boolean).join(' ')

// Replaces the status line at the end of the card, keeping the original formatting.
// Telegram returns plain text + entities (offsets in UTF-16 units, same as JS string indices),
// so cutting the tail and appending a line never shifts the entities before it.
export function withStatus(message, line) {
	const text = message.text ?? ''
	const match = text.match(STATUS_LINE)
	const base = match ? text.slice(0, match.index) : text
	const entities = (message.entities ?? [])
		.filter(e => e.offset < base.length)
		.map(e => ({ ...e, length: Math.min(e.length, base.length - e.offset) }))

	if (!line) return { text: base, entities }

	const suffix = `\n\n${line}`
	return {
		text: base + suffix,
		entities: [...entities, { type: 'bold', offset: base.length + 2, length: line.length }],
	}
}

export async function handleTelegramUpdate(update, { env, log = console, now = new Date() }) {
	const query = update?.callback_query
	if (!query?.message) return

	const token = env.TELEGRAM_BOT_TOKEN
	const answer = text =>
		callApi(token, 'answerCallbackQuery', { callback_query_id: query.id, text }).catch(() => {})

	// Only cards in our group, only our actions
	const action = ACTIONS[query.data]
	if (!action || String(query.message.chat.id) !== String(env.TELEGRAM_CHAT_ID)) {
		await answer()
		return
	}

	const line = action.mark ? `${action.mark} Статус: ${action.label} — ${displayName(query.from)} · ${tbilisiTime(now)}` : null
	const { text, entities } = withStatus(query.message, line)
	// Keep the "Написать клиенту" URL button if the card has one
	const contact = query.message.reply_markup?.inline_keyboard?.[0]?.find(button => button.url) ?? null

	try {
		await callApi(token, 'editMessageText', {
			chat_id: query.message.chat.id,
			message_id: query.message.message_id,
			text,
			entities,
			link_preview_options: { is_disabled: true },
			reply_markup: cardKeyboard(contact, action.status),
		})
		await answer(action.toast)
	} catch (error) {
		// "message is not modified" when two people press at once — harmless
		log.error('[telegram-webhook]', error.message)
		await answer()
	}
}
