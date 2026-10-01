export default function initReveal() {
	// Repeat page in the same visit (e.g. language switch): content is shown as-is, see _main.scss
	if (document.documentElement.classList.contains('no-intro')) return

	const items = document.querySelectorAll('[data-reveal]')
	if (!items.length) return

	if (!('IntersectionObserver' in window)) {
		items.forEach(item => item.classList.add('is-revealed'))
		return
	}

	const observer = new IntersectionObserver(entries => {
		entries.forEach(entry => {
			if (!entry.isIntersecting) return
			entry.target.classList.add('is-revealed')
			observer.unobserve(entry.target)
		})
	}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })

	items.forEach(item => observer.observe(item))
}
