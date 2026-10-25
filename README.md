# BatumiParts.ge — auto parts sourcing landing page in Batumi

A single-page site with a request form for finding a part by VIN.

Stack: Vite 8 + Handlebars partials + SCSS, no frameworks. JS ~5 KB gzip.

```bash
npm install
npm run dev       # dev server + mock /api/request
npm run build     # static output to dist/
npm run preview   # check the build (mock API works too)
```

## What to change where

| What | Where |
| --- | --- |
| Texts (RU / UA / EN) | `src/i18n/ru.json`, `uk.json`, `en.json` |
| Delivery times (text) | `src/i18n/*.json` → `delivery.items` |
| Delivery time bar length (0–1, `0` = "to be confirmed") | `src/data/site.json` → `delivery` |
| Domain, name | `src/data/site.json` |
| Colors, fonts, radii | `src/scss/_vars.scss` |
| Section markup | `src/partials/sections/*.hbs` |
| Icons (SVG sprite) | `src/partials/layout/icons.hbs` |

After changing the domain, also update `public/robots.txt` and `public/sitemap.xml`.
OG image: `node scripts/generate-og.mjs` → `public/og.png`.

## Languages

Each language is a separate static page (better for SEO): `/` — RU, `/uk/`, `/en/`.
The language list is in `build/page-context.js` → `LOCALES`. To add a language: add it to `LOCALES`,
create `src/i18n/<code>.json` and `<code>/index.html` (a copy of the root `index.html`).

## Structure

```plaintext
build/page-context.js      # template data: language, texts, links, schema.org
server/mock-api.js         # local mock of the request endpoint (dev/preview only)
src/
├── i18n/                  # texts per language
├── data/site.json         # contacts and settings shared across all languages
├── partials/
│   ├── layout/            # head, header, footer, page, icons
│   ├── sections/          # hero, how-it-works, benefits, delivery, auction-cars, reviews, faq, final-cta
│   └── components/        # request-form, vin-plate, lang-switch, floating-actions, logo, icon
├── js/
│   ├── config.js          # VITE_API_ENDPOINT, VITE_TURNSTILE_SITE_KEY
│   └── modules/           # request-form, validation (shared with the server), file-picker, draft, faq, ...
└── scss/                  # _vars, _global, components/, sections/
```

## Form and backend

Flow: site → `/api/request` (Netlify Function) → Telegram bot → group. **The bot token lives on the server only.**

| File | Role |
| --- | --- |
| `server/handle-request.js` | All endpoint logic: rate limit, anti-spam, Turnstile, validation, request number. The response contract is documented there too |
| `server/telegram.js` | Sends the request card + photos to the group via the Bot API |
| `netlify/functions/request.mjs` | Netlify wrapper (production) |
| `server/telegram-webhook.js` + `netlify/functions/telegram-webhook.mjs` | Buttons under the card: "Taken" / "Done". The status is stored in the card text |
| `server/mock-api.js` | The same for `npm run dev` / `preview`. No secrets — just logs to the console |

Photos are compressed in the browser (up to 1920px, JPEG) — Netlify's request body limit is 6 MB.

### Environment variables

Locally — `.env.local` (template: `.env.example`); on Netlify — Site configuration → Environment variables.

| Variable | Where | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | server | token from @BotFather |
| `TELEGRAM_CHAT_ID` | server | group ID (`npm run tg:chat-id`) |
| `TELEGRAM_WEBHOOK_SECRET` | server | protects `/api/telegram-webhook` (status buttons) |
| `TURNSTILE_SECRET_KEY` | server | optional, captcha verification |
| `VITE_TURNSTILE_SITE_KEY` | browser | optional, shows the captcha |
| `SITE_URL` | build | optional; set automatically on Netlify |

`npm run tg:test` — send a test request to the group.
`npm run tg:webhook -- https://<site>` — enable the status buttons (after deploy); `-- --delete` — disable them.

### Deploy (Cloudflare Pages — primary)

Build command `npm run build`, output `dist`, variable `NODE_VERSION=22`. Server functions are in `functions/api/*.js` (thin wrappers over `server/`). Secrets — Pages → Settings → Variables and Secrets. Every `git push` deploys.

### Deploy (Netlify — testing, can be removed after the migration)

Build settings are in `netlify.toml`. Connect the repository in Netlify → set the variables → every `git push` deploys.
While the site is served from a domain other than the main one (`site.json → url`), pages are marked `noindex`.

The form draft is stored in `localStorage` (except files) and cleared after a successful submission.
