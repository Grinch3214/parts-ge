import fs from 'node:fs'
import path from 'node:path'

export const LOCALES = [
	{ code: 'ru', label: 'RU', name: 'Русский', ogLocale: 'ru_RU' },
	{ code: 'uk', label: 'UA', name: 'Українська', ogLocale: 'uk_UA' },
	{ code: 'en', label: 'EN', name: 'English', ogLocale: 'en_US' },
]
export const DEFAULT_LOCALE = 'ru'

export const localePath = code => (code === DEFAULT_LOCALE ? '/' : `/${code}/`)

export function localeFromPagePath(pagePath) {
	const firstSegment = pagePath.replace(/^\/+/, '').split('/')[0]
	return LOCALES.some(l => l.code === firstSegment) ? firstSegment : DEFAULT_LOCALE
}

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf-8'))

// Builds the Handlebars context for a page: texts for its language + shared site data.
// Files are re-read on every call so edits to JSON show up on dev-server reload.
export function createPageContext(root) {
	return pagePath => {
		const lang = localeFromPagePath(pagePath)
		const site = readJson(path.join(root, 'src/data/site.json'))
		const t = readJson(path.join(root, `src/i18n/${lang}.json`))
		const base = site.url.replace(/\/$/, '')
		const canonical = base + localePath(lang)

		const locales = LOCALES.map(l => ({
			...l,
			url: localePath(l.code),
			absUrl: base + localePath(l.code),
			active: l.code === lang,
		}))

		const links = {
			whatsapp: `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(t.contacts.waText)}`,
			telegram: `https://t.me/${site.telegram}`,
			viber: `viber://chat?number=${encodeURIComponent(site.viber)}`,
			tel: `tel:${site.phone}`,
		}

		const schema = {
			business: {
				'@context': 'https://schema.org',
				'@type': 'AutoPartsStore',
				'@id': `${base}/#business`,
				name: site.name,
				url: canonical,
				description: t.meta.description,
				telephone: site.phone,
				image: `${base}/og.png`,
				address: { '@type': 'PostalAddress', addressLocality: 'Batumi', addressCountry: 'GE' },
				areaServed: { '@type': 'City', name: 'Batumi' },
				knowsLanguage: LOCALES.map(l => l.code),
			},
			faq: {
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: t.faq.items.map(item => ({
					'@type': 'Question',
					name: item.q,
					acceptedAnswer: { '@type': 'Answer', text: item.a },
				})),
			},
		}

		return {
			lang,
			t,
			site,
			links,
			locales,
			canonical,
			ogLocale: LOCALES.find(l => l.code === lang).ogLocale,
			ogAlternates: locales.filter(l => !l.active).map(l => l.ogLocale),
			defaultUrl: base + localePath(DEFAULT_LOCALE),
			homeUrl: localePath(lang),
			year: new Date().getFullYear(),
			delivery: t.delivery.items.map(item => ({ ...item, scale: site.delivery[item.code] ?? 0 })),
			vinChars: [...site.vinSample].map((char, i) => ({ char, group: i < 3 ? 0 : i < 9 ? 1 : 2 })),
			methods: ['whatsapp', 'telegram', 'viber', 'phone'].map(id => ({ id, label: t.form.methods[id] })),
			preferences: ['any', 'original', 'analog', 'used'].map(id => ({ id, label: t.form.preferences[id] })),
			schema,
			// Strings the form script needs at runtime (errors, states)
			formRuntime: {
				errors: t.form.errors,
				contact: { labels: t.form.contactLabels, placeholders: t.form.contactPlaceholders },
				submit: t.form.submit,
				sending: t.form.sending,
				remove: t.form.remove,
				successTitle: t.success.title,
			},
		}
	}
}
