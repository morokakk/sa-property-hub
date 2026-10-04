'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MAX_ATTEMPTS = 60; // ~1s of animation frames while the target page (or its Suspense boundary) renders
const HEADER_GAP_PX = 12;

/**
 * Pushes the page down so the target isn't hidden under a sticky/fixed header (e.g. the mobile app bar).
 */
function clearStickyHeaders(target: HTMLElement) {
  const targetTop = target.getBoundingClientRect().top;
  let coveredUntil = 0;
  document.querySelectorAll('header').forEach((header) => {
    const position = window.getComputedStyle(header).position;
    if (position !== 'sticky' && position !== 'fixed') return;
    const rect = header.getBoundingClientRect();
    if (rect.top <= 1 && rect.bottom > coveredUntil) coveredUntil = rect.bottom;
  });
  const overlap = coveredUntil + HEADER_GAP_PX - targetTop;
  if (coveredUntil > 0 && overlap > 0) window.scrollBy(0, -overlap);
}

/**
 * Makes `/route#anchor` deep links work on a hard load, too. Pages render only after the ClientOnly
 * mount gate, so the browser's native hash scroll fires before the target element exists.
 * This waits briefly for the element and then scrolls to it. It does nothing when there is no hash.
 */
export default function HashScroller() {
  const pathname = usePathname();

  useEffect(() => {
    let rafId = 0;
    let cancelled = false;

    const scrollToHash = () => {
      cancelAnimationFrame(rafId);
      const rawHash = window.location.hash.slice(1);
      if (!rawHash) return;
      let id = rawHash;
      try {
        id = decodeURIComponent(rawHash);
      } catch {
        // Malformed escape sequence: fall back to the raw hash.
      }

      let attempts = 0;
      const attempt = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ block: 'start' });
          clearStickyHeaders(el);
          return;
        }
        if (attempts++ < MAX_ATTEMPTS) rafId = requestAnimationFrame(attempt);
      };
      attempt();
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, [pathname]);

  return null;
}
