import imagemin from 'imagemin'
import imageminWebp from 'imagemin-webp'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import handlebars from 'vite-plugin-handlebars'
import { createPageContext, LOCALES, DEFAULT_LOCALE } from './build/page-context.js'
import mockApi from './server/mock-api.js'
import fontPreload from './build/font-preload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// you can use your path for your project
const rootPath = '/'
// example: const rootPath = '/my-path/'

// One static page per language: / (ru), /uk/, /en/
const pages = Object.fromEntries(
	LOCALES.map(({ code }) => {
		const name = code === DEFAULT_LOCALE ? 'index' : `${code}/index`
		return [name, path.resolve(__dirname, `${name}.html`)]
	})
)

export default defineConfig(({ mode }) => {
	// All vars from .env / .env.local (not only VITE_*) — used by the local /api/request only
	const env = loadEnv(mode, __dirname, '')

	return {
		plugins: [
			handlebars({
				partialDirectory: path.resolve(__dirname, 'src/partials'),
				context: createPageContext(__dirname),
				helpers: {
					// Safe for <script type="application/ld+json"> and <script type="application/json">
					json: value => JSON.stringify(value ?? null).replace(/</g, '\\u003c'),
				},
			}),
			mockApi(env),
			fontPreload(),
			ViteImageOptimizer({
				svg: {
					plugins: [
						'removeDoctype',
						'removeXMLProcInst',
						'minifyStyles',
						'sortAttrs',
						'sortDefsChildren',
					],
				},
				png: {
					quality: 70,
				},
				jpeg: {
					quality: 70,
				},
				jpg: {
					quality: 70,
				}
			}),
			{
				name: 'webp-converter',
				apply: 'serve',
				async buildStart() {
					await imagemin(['./src/img/**/*.{jpg,png,jpeg}'], {
						destination: './src/img/webp/',
						plugins: [imageminWebp({ quality: 70 })]
					})
				}
			},
			{
				name: 'handlebars-hmr',
				configureServer(server) {
					const watchDirs = [
						path.resolve(__dirname, 'src/data'),
						path.resolve(__dirname, 'src/i18n'),
						path.resolve(__dirname, 'src/partials'),
					]
					watchDirs.forEach(dir => server.watcher.add(dir))
					server.watcher.on('change', filePath => {
						if (watchDirs.some(dir => filePath.startsWith(dir))) {
							server.ws.send({ type: 'full-reload' })
						}
					})
				}
			}
		],
		build: {
			rollupOptions: {
				input: pages,
			},
		},
		base: rootPath,
	}
})
