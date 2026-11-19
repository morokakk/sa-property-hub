'use client';

import { useState, useCallback, useEffect, type CSSProperties, type RefObject } from 'react';

export interface ViewportDropdownOptions {
  /** Menu width in px on mobile (< 640px). */
  width: number;
  /** Optional menu width in px on >= 640px screens (defaults to `width`). */
  smWidth?: number;
  /** Minimum horizontal viewport margin in px (defaults to 16px, matching `calc(100vw - 2rem)`). */
  padding?: number;
}

export interface ViewportDropdownPosition {
  alignClass: 'left-0' | 'right-0';
  style?: CSSProperties;
}

/**
 * Computes whether a dropdown menu anchored to `anchorEl` should align `left-0`,
 * `right-0`, or use an inline horizontal clamp so it never clips outside the viewport.
 */
export function computeViewportDropdownPosition(
  anchorEl: HTMLElement | null,
  { width, smWidth, padding = 16 }: ViewportDropdownOptions
): ViewportDropdownPosition {
  if (!anchorEl || typeof window === 'undefined') {
    return { alignClass: 'right-0' };
  }

  const rect = anchorEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const desiredWidth = viewportWidth >= 640 ? (smWidth ?? width) : width;
  const menuWidth = Math.min(desiredWidth, Math.max(0, viewportWidth - padding * 2));

  const fitsRightAligned = rect.right - menuWidth >= padding;
  const fitsLeftAligned = rect.left + menuWidth <= viewportWidth - padding;

  if (viewportWidth >= 640) {
    if (fitsRightAligned) {
      return { alignClass: 'right-0' };
    }
    if (fitsLeftAligned) {
      return { alignClass: 'left-0' };
    }
    return {
      alignClass: 'left-0',
      style: { left: padding - rect.left, right: 'auto' },
    };
  }

  if (fitsLeftAligned) {
    return { alignClass: 'left-0' };
  }
  if (fitsRightAligned) {
    return { alignClass: 'right-0' };
  }

  const clampedScreenLeft = Math.max(padding, viewportWidth - padding - menuWidth);
  return {
    alignClass: 'left-0',
    style: { left: clampedScreenLeft - rect.left, right: 'auto' },
  };
}

/**
 * React hook that keeps an absolutely positioned dropdown menu inside the viewport
 * on open and whenever the window resizes while open.
 */
export function useViewportDropdownPosition(
  anchorRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  options: ViewportDropdownOptions
) {
  const { width, smWidth, padding = 16 } = options;
  const [position, setPosition] = useState<ViewportDropdownPosition>({ alignClass: 'right-0' });

  const updatePosition = useCallback(() => {
    setPosition(
      computeViewportDropdownPosition(anchorRef.current, { width, smWidth, padding })
    );
  }, [anchorRef, width, smWidth, padding]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, updatePosition]);

  return {
    alignClass: position.alignClass,
    style: position.style,
    updatePosition,
  };
}
