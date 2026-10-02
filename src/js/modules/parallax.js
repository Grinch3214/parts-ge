import { prefersReducedMotion } from './motion.js';

const RATE = -0.15;

export default function initParallax() {
  const element = document.querySelector('[data-parallax]');
  if (
    !element ||
    prefersReducedMotion() ||
    !window.matchMedia('(min-width: 1024px)').matches
  )
    return;

  const hero = element.closest('section');
  let ticking = false;

  const update = () => {
    ticking = false;
    const limit = hero.offsetHeight;
    if (window.scrollY > limit) return;
    element.style.setProperty(
      '--parallax',
      `${(window.scrollY * RATE).toFixed(1)}px`,
    );
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}
