'use client';

import { useEffect } from 'react';

/**
 * Adds `is-in` to every [data-reveal] element as it scrolls into view, which
 * lets CSS grow bars and meters. Without JS, CSS shows the final state.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('.ar [data-reveal]');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    targets.forEach((el) => observer.observe(el));
    // Printing must never show half-grown bars.
    const reveal = () => targets.forEach((el) => el.classList.add('is-in'));
    window.addEventListener('beforeprint', reveal);
    return () => { observer.disconnect(); window.removeEventListener('beforeprint', reveal); };
  }, []);
  return null;
}
