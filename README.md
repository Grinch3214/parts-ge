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
| Телефон, WhatsApp, Telegram, Viber, домен | `src/data/site.json` (сейчас заглушки) |
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
│   ├── sections/          # hero, how-it-works, benefits, delivery, auction-cars, faq, contacts
│   └── components/        # request-form, vin-plate, lang-switch, floating-actions, logo, icon
├── js/
│   ├── config.js          # VITE_API_ENDPOINT, VITE_TURNSTILE_SITE_KEY
│   └── modules/           # request-form, validation (общая с сервером), file-picker, draft, faq, ...
└── scss/                  # _vars, _global, components/, sections/
```

## Форма и бэкенд

Схема: сайт → серверный эндпоинт → Telegram-бот → группа. **Токен бота живёт только на сервере.**

Контракт эндпоинта (`POST /api/request`, `multipart/form-data`) описан в `server/mock-api.js`:
`200 { ok, id }`, `422 { ok: false, errors }`, `429 { error: 'rateLimit' }`.
Поля: `mode`, `vin` | `docPhoto`, `part`, `contactMethod`, `contact`, `car`, `partNumber`, `preference`,
`name`, `partPhotos[]`, `lang`, `page` + антиспам: `website` (honeypot), `_t` (время открытия формы),
`cf-turnstile-response` (если включён Turnstile).

Переменные окружения фронтенда (`.env.local`):

```bash
VITE_API_ENDPOINT=https://…/api/request   # по умолчанию /api/request
VITE_TURNSTILE_SITE_KEY=…                 # пусто — Turnstile не загружается
```

Черновик формы хранится в `localStorage` (кроме файлов) и очищается после успешной отправки.
