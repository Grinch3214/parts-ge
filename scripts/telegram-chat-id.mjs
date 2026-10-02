// Finds the ID of the group the bot was added to.
// 1) add the bot to the group, 2) write any message in the group, 3) npm run tg:chat-id
const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
	console.error('Нет TELEGRAM_BOT_TOKEN в .env.local')
	process.exit(1)
}

const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
const data = await response.json()
if (!data.ok) {
	// 409 Conflict: a webhook is set (card buttons) — getUpdates doesn't work while it is
	if (data.error_code === 409) console.error('Включён webhook для кнопок. Временно выключите: npm run tg:webhook -- --delete')
	console.error('Telegram ответил ошибкой:', data.description)
	process.exit(1)
}

const chats = new Map()
for (const update of data.result) {
	const chat = (update.message || update.my_chat_member || update.channel_post)?.chat
	if (chat && chat.type !== 'private') chats.set(chat.id, chat.title)
}

if (!chats.size) {
	console.log('Групп не найдено. Добавьте бота в группу, напишите там любое сообщение и запустите снова.')
} else {
	console.log('Группы, где есть бот:')
	for (const [id, title] of chats) console.log(`  ${title}:  TELEGRAM_CHAT_ID=${id}`)
}
