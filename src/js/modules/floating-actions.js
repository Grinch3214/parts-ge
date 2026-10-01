// Mobile bottom bar: shown only when neither the form nor the contacts are on screen,
// and hidden while the user is typing (the on-screen keyboard is up).
export default function initFloatingActions() {
	const bar = document.querySelector('[data-floating]')
	if (!bar || !('IntersectionObserver' in window)) return

	const watched = ['#request', '#contacts', '.footer']
		.map(selector => document.querySelector(selector))
		.filter(Boolean)
	const visible = new Set()
	let typing = false

	const update = () => {
		const show = visible.size === 0 && !typing && window.scrollY > 240
		bar.classList.toggle('is-visible', show)
	}

	const observer = new IntersectionObserver(entries => {
		entries.forEach(entry => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)))
		update()
	}, { threshold: 0.1 })
	watched.forEach(element => observer.observe(element))

	const isField = element => element?.matches?.('input:not([type="radio"]):not([type="checkbox"]), textarea')
	document.addEventListener('focusin', event => {
		typing = isField(event.target)
		update()
	})
	document.addEventListener('focusout', () => {
		typing = false
		update()
	})
	window.addEventListener('scroll', update, { passive: true })
}
