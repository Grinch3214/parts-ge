const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

export const prefersReducedMotion = () => reducedMotionQuery.matches

export const EASE_OUT = 'cubic-bezier(.2, .7, .2, 1)'

export const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth')

// Cross-fades two panels inside a container and animates the container height between them
export async function swapPanels(container, from, to) {
	if (prefersReducedMotion() || !container.animate) {
		from.hidden = true
		to.hidden = false
		return
	}

	const startHeight = container.offsetHeight
	await from.animate(
		[{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }],
		{ duration: 180, easing: 'ease-in' }
	).finished

	from.hidden = true
	to.hidden = false
	const endHeight = container.offsetHeight

	container.style.overflow = 'hidden'
	const resize = container.animate(
		[{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
		{ duration: 380, easing: EASE_OUT }
	)
	to.animate(
		[{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
		{ duration: 420, delay: 80, easing: EASE_OUT, fill: 'backwards' }
	)
	await resize.finished
	container.style.overflow = ''
}
