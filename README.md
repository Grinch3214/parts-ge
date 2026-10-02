# BatumiParts.ge — лендинг подбора автозапчастей в Батуми

Одностраничник с заявкой на подбор запчасти по VIN.

Стек: Vite 8 + Handlebars-partials + SCSS, без фреймворков. JS ~5 КБ gzip.

```bash
npm install
npm run dev       # dev-сервер + mock /api/request
npm run build     # статика в dist/
npm run preview   # проверить сборку (mock API тоже работает)
```

## Где что менять

| Что | Где |
| --- | --- |
| Тексты (RU / UA / EN) | `src/i18n/ru.json`, `uk.json`, `en.json` |
| Сроки доставки (текст) | `src/i18n/*.json` → `delivery.items` |
| Длина полосок сроков (0–1, `0` = «уточняем») | `src/data/site.json` → `delivery` |
| Домен, название | `src/data/site.json` |
| Цвета, шрифты, радиусы | `src/scss/_vars.scss` |
| Разметка секций | `src/partials/sections/*.hbs` |
| Иконки (SVG-спрайт) | `src/partials/layout/icons.hbs` |

После смены домена обновить также `public/robots.txt` и `public/sitemap.xml`.
OG-картинка: `node scripts/generate-og.mjs` → `public/og.png`.

## Языки

Каждый язык — отдельная статическая страница (лучше для SEO): `/` — RU, `/uk/`, `/en/`.
Список языков — `build/page-context.js` → `LOCALES`. Чтобы добавить язык: добавить его в `LOCALES`,
создать `src/i18n/<code>.json` и `<code>/index.html` (копия корневого `index.html`).

## Структура

```plaintext
build/page-context.js      # данные для шаблонов: язык, тексты, ссылки, schema.org
server/mock-api.js         # локальный mock эндпоинта заявок (только dev/preview)
src/
├── i18n/                  # тексты по языкам
├── data/site.json         # контакты и настройки, общие для всех языков
├── partials/
│   ├── layout/            # head, header, footer, page, icons
│   ├── sections/          # hero, how-it-works, benefits, delivery, auction-cars, reviews, faq, final-cta
│   └── components/        # request-form, vin-plate, lang-switch, floating-actions, logo, icon
├── js/
│   ├── config.js          # VITE_API_ENDPOINT, VITE_TURNSTILE_SITE_KEY
│   └── modules/           # request-form, validation (общая с сервером), file-picker, draft, faq, ...
└── scss/                  # _vars, _global, components/, sections/
```

## Форма и бэкенд

Схема: сайт → `/api/request` (Netlify Function) → Telegram-бот → группа. **Токен бота живёт только на сервере.**

| Файл | Роль |
| --- | --- |
| `server/handle-request.js` | Вся логика эндпоинта: лимит, антиспам, Turnstile, валидация, номер заявки. Там же описан контракт ответов |
| `server/telegram.js` | Карточка заявки + фото в группу через Bot API |
| `netlify/functions/request.mjs` | Обёртка для Netlify (production) |
| `server/telegram-webhook.js` + `netlify/functions/telegram-webhook.mjs` | Кнопки под карточкой: «Взял в работу» / «Обработана». Статус хранится в тексте карточки |
| `server/mock-api.js` | То же для `npm run dev` / `preview`. Без секретов — только лог в консоль |

Фото сжимаются в браузере (до 1920px, JPEG) — лимит тела запроса у Netlify 6 МБ.

### Переменные окружения

Локально — `.env.local` (шаблон: `.env.example`), на Netlify — Site configuration → Environment variables.

| Переменная | Где | Зачем |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | сервер | токен от @BotFather |
| `TELEGRAM_CHAT_ID` | сервер | ID группы (`npm run tg:chat-id`) |
| `TELEGRAM_WEBHOOK_SECRET` | сервер | защищает `/api/telegram-webhook` (кнопки статуса) |
| `TURNSTILE_SECRET_KEY` | сервер | необязательно, проверка капчи |
| `VITE_TURNSTILE_SITE_KEY` | браузер | необязательно, показ капчи |
| `SITE_URL` | сборка | необязательно; на Netlify подставляется сам |

`npm run tg:test` — отправить тестовую заявку в группу.
`npm run tg:webhook -- https://<сайт>` — включить кнопки статуса (после деплоя); `-- --delete` — выключить.

### Деплой (Cloudflare Pages — основной)

Build command `npm run build`, output `dist`, переменная `NODE_VERSION=22`. Серверные функции — `functions/api/*.js` (тонкие обёртки над `server/`). Секреты — Pages → Settings → Variables and Secrets. Каждый `git push` деплоит.

### Деплой (Netlify — тестовый, можно удалить после переезда)

Настройки сборки — в `netlify.toml`. Подключить репозиторий в Netlify → задать переменные → каждый `git push` деплоит.
Пока сайт открыт не на основном домене (`site.json → url`), страницы помечаются `noindex`.

Черновик формы хранится в `localStorage` (кроме файлов) и очищается после успешной отправки.
