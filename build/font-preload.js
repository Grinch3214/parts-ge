import { localeFromPagePath } from './page-context.js'

// Preloads the main text font so it is usually ready by first paint (less "swap" reflow).
// File names are hashed at build time, so links are injected from the final bundle.
const FONT_FILES = /golos-text-(cyrillic|latin)-wght-normal.*\.woff2$/

const subsetsFor = pagePath => (localeFromPagePath(pagePath) === 'en' ? ['latin'] : ['cyrillic', 'latin'])

export default function fontPreload() {
	let base = '/'

	return {
		name: 'font-preload',
		apply: 'build',
		configResolved(config) {
			base = config.base
		},
		transformIndexHtml: {
			order: 'post',
			handler(html, ctx) {
				if (!ctx.bundle) return
				const subsets = subsetsFor(ctx.path)
				return Object.keys(ctx.bundle)
					.filter(file => {
						const match = file.match(FONT_FILES)
						return match && subsets.includes(match[1])
					})
					.map(file => ({
						tag: 'link',
						attrs: { rel: 'preload', href: base + file, as: 'font', type: 'font/woff2', crossorigin: '' },
						injectTo: 'head',
					}))
			},
		},
	}
}
