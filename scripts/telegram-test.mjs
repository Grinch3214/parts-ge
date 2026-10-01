// Sends a sample request card to the group — checks token, chat ID and formatting.
// npm run tg:test
import { sendToTelegram } from '../server/telegram.js'

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = process.env
if (!token || !chatId) {
	console.error('Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.local')
	process.exit(1)
}

await sendToTelegram({ token, chatId }, {
	id: 'TEST-001',
	vin: 'JTDKN3DU5A0123456',
	part: 'Тестовая заявка: левая передняя фара',
	contactMethod: 'whatsapp',
	contact: '555 12 34 56',
	car: 'Toyota Prius 2010',
	partNumber: '81150-47120',
	preference: 'original',
	name: 'Тест',
	lang: 'ru',
	files: [],
})
console.log('Готово — проверьте группу в Telegram.')
