export default function initHeader() {
	const header = document.querySelector('[data-header]')
	if (!header) return

	let ticking = false
	const update = () => {
		header.classList.toggle('is-scrolled', window.scrollY > 4)
		ticking = false
	}

	window.addEventListener('scroll', () => {
		if (!ticking) {
			ticking = true
			requestAnimationFrame(update)
		}
	}, { passive: true })
	update()
}
