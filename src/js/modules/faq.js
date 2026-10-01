import { prefersReducedMotion, EASE_OUT } from './motion.js'

// Native <details> (works without JS) + smooth height animation on top
export default function initFaq() {
	document.querySelectorAll('[data-faq] details').forEach(details => {
		const summary = details.querySelector('summary')
		const answer = details.querySelector('.faq__a')
		let animation = null

		summary.addEventListener('click', event => {
			if (prefersReducedMotion() || !answer.animate) return
			event.preventDefault()
			animation?.cancel()

			if (!details.open || details.classList.contains('is-closing')) {
				details.classList.remove('is-closing')
				details.open = true
				const height = answer.offsetHeight
				animation = answer.animate(
					[{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }],
					{ duration: 320, easing: EASE_OUT }
				)
				animation.onfinish = () => (animation = null)
			} else {
				details.classList.add('is-closing')
				const height = answer.offsetHeight
				animation = answer.animate(
					[{ height: `${height}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
					{ duration: 240, easing: EASE_OUT }
				)
				animation.onfinish = () => {
					details.open = false
					details.classList.remove('is-closing')
					animation = null
				}
			}
		})
	})
}
