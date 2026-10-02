import { prefersReducedMotion } from './motion.js';

// Scroll-linked motion of the hero drawing. CSS reads the variables (see _drawing.scss):
//   --parallax  the drawing drifts up a little (desktop only)
//   --spin      the brake disc turns like a rolling wheel (all screens); the caliper stays still
const RATE = -0.15; // px of drift per px of scroll
const SPIN = 0.15; // degrees of disc rotation per px of scroll

export default function initParallax() {
  const element = document.querySelector('[data-parallax]');
  if (!element || prefersReducedMotion()) return;

  const hero = element.closest('section');
  const desktop = window.matchMedia('(min-width: 1024px)');
  let ticking = false;

  const update = () => {
    ticking = false;
    // Only while the hero is on screen — no work further down the page
    const scroll = Math.min(window.scrollY, hero.offsetHeight);
    element.style.setProperty('--spin', `${(scroll * SPIN).toFixed(1)}deg`);
    element.style.setProperty(
      '--parallax',
      desktop.matches ? `${(scroll * RATE).toFixed(1)}px` : '0px',
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
