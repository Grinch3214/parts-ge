import { scrollBehavior, prefersReducedMotion } from './motion.js'

export default function initNavigation() {
	// "Подобрать запчасть" anywhere on the page: scroll to the form and move focus to its heading
	document.addEventListener('click', event => {
		const link = event.target.closest('[data-to-form]')
		if (!link) return

		const target = document.getElementById('request')
		if (!target) return

		event.preventDefault()
		target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
		history.replaceState(null, '', '#request')

		const heading = [...target.querySelectorAll('h2')].find(h => h.offsetParent !== null)
		setTimeout(() => heading?.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 450)
	})

	// Keep the current section when switching language
	document.querySelectorAll('[data-lang-link]').forEach(link => {
		link.addEventListener('click', () => {
			if (location.hash) link.href = link.getAttribute('href').split('#')[0] + location.hash
		})
	})
}
