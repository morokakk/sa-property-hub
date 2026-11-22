'use client';

import { useRef } from 'react';

export interface BackdropDismissEventLike {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  stopPropagation: () => void;
}

export interface BackdropDismissState {
  startedOnBackdrop: boolean;
  endedOnBackdrop: boolean;
}

export interface BackdropDismissHandlers {
  onPointerDown: (e: BackdropDismissEventLike) => void;
  onPointerUp: (e: BackdropDismissEventLike) => void;
  onClick: (e: BackdropDismissEventLike) => void;
}

/**
 * Builds pointer/click handlers that only invoke `onClose` when both
 * pointerdown and pointerup (plus click) occur directly on the backdrop element,
 * preventing accidental dismissal from text-selection drag-outs or drag-ins.
 */
export function createBackdropDismissHandlers(
  state: BackdropDismissState,
  onClose: () => void,
  disabled = false
): BackdropDismissHandlers {
  return {
    onPointerDown: (e) => {
      state.startedOnBackdrop = e.target === e.currentTarget;
      state.endedOnBackdrop = false;
    },
    onPointerUp: (e) => {
      state.endedOnBackdrop = e.target === e.currentTarget;
    },
    onClick: (e) => {
      const started = state.startedOnBackdrop;
      const ended = state.endedOnBackdrop;
      state.startedOnBackdrop = false;
      state.endedOnBackdrop = false;

      if (e.target !== e.currentTarget) return;
      e.stopPropagation();
      if (disabled) return;
      if (started && ended) {
        onClose();
      }
    },
  };
}

/**
 * React hook returning drag-safe, async-guardable modal backdrop handlers.
 * Call unconditionally at the top level of the modal component before any early return.
 */
export function useModalBackdropDismiss(
  onClose: () => void,
  disabled = false
): BackdropDismissHandlers {
  const stateRef = useRef<BackdropDismissState>({
    startedOnBackdrop: false,
    endedOnBackdrop: false,
  });

  return createBackdropDismissHandlers(stateRef.current, onClose, disabled);
}
