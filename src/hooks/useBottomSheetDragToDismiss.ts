'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface UseBottomSheetDragToDismissOptions {
  onClose: () => void;
  disabled?: boolean;
  thresholdPx?: number;
  velocityThreshold?: number;
}

export interface DragPointerTargetLike {
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
  hasPointerCapture?: (pointerId: number) => boolean;
}

export interface DragPointerEventLike {
  button: number;
  clientY: number;
  pointerId: number;
  target: EventTarget | null;
  currentTarget: (EventTarget & DragPointerTargetLike) | null;
  stopPropagation: () => void;
  preventDefault?: () => void;
}

export interface BottomSheetDragState {
  isDragging: boolean;
  isSnappingBack: boolean;
  isDismissing: boolean;
  dragOffsetY: number;
}

export interface BottomSheetDragControllerEnv {
  getViewportWidth: () => number;
  prefersReducedMotion: () => boolean;
  now: () => number;
  scheduleTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelTimeout: (id: ReturnType<typeof setTimeout>) => void;
}

export interface BottomSheetDragHandlers {
  onPointerDown: (e: DragPointerEventLike) => void;
  onPointerMove: (e: DragPointerEventLike) => void;
  onPointerUp: (e: DragPointerEventLike) => void;
  onPointerCancel: (e: DragPointerEventLike) => void;
  onLostPointerCapture: (e: DragPointerEventLike) => void;
}

export interface BottomSheetDragHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (e: React.PointerEvent<HTMLElement>) => void;
}

export interface UseBottomSheetDragToDismissResult {
  sheetStyle: React.CSSProperties;
  dragHandleProps: BottomSheetDragHandleProps;
  isDragging: boolean;
  dragOffsetY: number;
}

export interface BottomSheetDragController {
  handlers: BottomSheetDragHandlers;
  updateOptions: (options: Partial<UseBottomSheetDragToDismissOptions>) => void;
  cancelActiveDrag: () => void;
  cleanup: () => void;
  getState: () => BottomSheetDragState;
}

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="button"], [data-no-drag]';

const MOBILE_BREAKPOINT_PX = 640;
const DRAG_DEADZONE_PX = 6;
const FAST_FLICK_MIN_DELTA_PX = 32;
const DISMISS_DURATION_MS = 150;
const SNAP_BACK_DURATION_MS = 200;

export const INITIAL_BOTTOM_SHEET_DRAG_STATE: BottomSheetDragState = {
  isDragging: false,
  isSnappingBack: false,
  isDismissing: false,
  dragOffsetY: 0,
};

const defaultEnv: BottomSheetDragControllerEnv = {
  getViewportWidth: () =>
    typeof window === 'undefined' ? 1024 : window.innerWidth,
  prefersReducedMotion: () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  now: () =>
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  scheduleTimeout: (fn, ms) => setTimeout(fn, ms),
  cancelTimeout: (id) => clearTimeout(id),
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const candidate = target as { closest?: (selector: string) => unknown };
  if (typeof candidate.closest !== 'function') return false;
  return Boolean(candidate.closest(INTERACTIVE_SELECTOR));
}

function releaseCaptureSafely(
  currentTarget: DragPointerEventLike['currentTarget'],
  pointerId: number
) {
  if (!currentTarget) return;
  try {
    if (
      typeof currentTarget.hasPointerCapture === 'function' &&
      !currentTarget.hasPointerCapture(pointerId)
    ) {
      return;
    }
    currentTarget.releasePointerCapture?.(pointerId);
  } catch {
    // Ignore release errors when pointer is already released or synthetic.
  }
}

export function buildBottomSheetStyle(
  state: BottomSheetDragState
): React.CSSProperties {
  if (state.isDragging) {
    return {
      transform: `translateY(${state.dragOffsetY}px)`,
      transition: 'none',
      willChange: 'transform',
    };
  }
  if (state.isDismissing) {
    return {
      transform: 'translateY(100%)',
      transition: `transform ${DISMISS_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      willChange: 'transform',
    };
  }
  if (state.isSnappingBack) {
    return {
      transform: 'translateY(0px)',
      transition: `transform ${SNAP_BACK_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    };
  }
  return {};
}

export function createBottomSheetDragController(params: {
  onClose: () => void;
  disabled?: boolean;
  thresholdPx?: number;
  velocityThreshold?: number;
  onStateChange: (nextState: BottomSheetDragState) => void;
  env?: Partial<BottomSheetDragControllerEnv>;
}): BottomSheetDragController {
  const env: BottomSheetDragControllerEnv = { ...defaultEnv, ...params.env };

  let onClose = params.onClose;
  let disabled = Boolean(params.disabled);
  let thresholdPx = params.thresholdPx ?? 90;
  let velocityThreshold = params.velocityThreshold ?? 0.45;

  let state: BottomSheetDragState = { ...INITIAL_BOTTOM_SHEET_DRAG_STATE };
  let activePointerId: number | null = null;
  let startY = 0;
  let startTime = 0;
  let lastOffsetY = 0;
  let activated = false;
  let captured = false;
  let hasClosedCurrentDismiss = false;
  let snapBackTimer: ReturnType<typeof setTimeout> | null = null;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  function setState(next: BottomSheetDragState) {
    if (
      state.isDragging === next.isDragging &&
      state.isSnappingBack === next.isSnappingBack &&
      state.isDismissing === next.isDismissing &&
      state.dragOffsetY === next.dragOffsetY
    ) {
      return;
    }
    state = next;
    params.onStateChange(next);
  }

  function clearSnapBackTimer() {
    if (snapBackTimer !== null) {
      env.cancelTimeout(snapBackTimer);
      snapBackTimer = null;
    }
  }

  function clearDismissTimer() {
    if (dismissTimer !== null) {
      env.cancelTimeout(dismissTimer);
      dismissTimer = null;
    }
  }

  function triggerSnapBack() {
    clearSnapBackTimer();
    setState({
      isDragging: false,
      isSnappingBack: true,
      isDismissing: false,
      dragOffsetY: 0,
    });
    snapBackTimer = env.scheduleTimeout(() => {
      snapBackTimer = null;
      setState({ ...INITIAL_BOTTOM_SHEET_DRAG_STATE });
    }, SNAP_BACK_DURATION_MS);
  }

  function resetTracking() {
    activePointerId = null;
    startY = 0;
    startTime = 0;
    lastOffsetY = 0;
    activated = false;
    captured = false;
  }

  function invokeCloseOnce() {
    if (hasClosedCurrentDismiss) return;
    hasClosedCurrentDismiss = true;
    onClose();
  }

  const handlers: BottomSheetDragHandlers = {
    onPointerDown: (e) => {
      if (disabled || state.isDismissing) return;
      if (env.getViewportWidth() >= MOBILE_BREAKPOINT_PX) return;
      if (e.button !== 0) return;
      if (activePointerId !== null) return;
      if (isInteractiveTarget(e.target)) return;

      activePointerId = e.pointerId;
      startY = e.clientY;
      startTime = env.now();
      lastOffsetY = 0;
      activated = false;
      captured = false;
    },

    onPointerMove: (e) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;
      if (disabled) {
        releaseCaptureSafely(e.currentTarget, activePointerId);
        const wasActivated = activated;
        resetTracking();
        if (wasActivated) triggerSnapBack();
        return;
      }

      const rawDeltaY = e.clientY - startY;

      if (!activated) {
        if (rawDeltaY <= DRAG_DEADZONE_PX) return;
        activated = true;
        clearSnapBackTimer();
        e.stopPropagation();
        try {
          e.currentTarget?.setPointerCapture?.(e.pointerId);
          captured = true;
        } catch {
          captured = false;
        }
      } else {
        e.stopPropagation();
      }

      const offsetY = Math.max(0, rawDeltaY);
      lastOffsetY = offsetY;
      setState({
        isDragging: true,
        isSnappingBack: false,
        isDismissing: false,
        dragOffsetY: offsetY,
      });
    },

    onPointerUp: (e) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;
      const pointerId = activePointerId;
      const currentTarget = e.currentTarget;
      const wasCaptured = captured;
      const wasActivated = activated;
      const savedStartY = startY;
      const savedStartTime = startTime;
      const savedLastOffsetY = lastOffsetY;

      resetTracking();
      if (wasCaptured) {
        releaseCaptureSafely(currentTarget, pointerId);
      }

      if (!wasActivated) return;
      e.stopPropagation();

      const rawDeltaY = e.clientY - savedStartY;
      const deltaY = Number.isFinite(rawDeltaY)
        ? Math.max(0, rawDeltaY)
        : savedLastOffsetY;
      const elapsedMs = Math.max(1, env.now() - savedStartTime);
      const velocity = deltaY / elapsedMs;

      const shouldDismiss =
        !disabled &&
        (deltaY >= thresholdPx ||
          (deltaY >= FAST_FLICK_MIN_DELTA_PX &&
            velocity >= velocityThreshold));

      if (!shouldDismiss) {
        triggerSnapBack();
        return;
      }

      clearSnapBackTimer();
      clearDismissTimer();
      hasClosedCurrentDismiss = false;

      if (env.prefersReducedMotion()) {
        setState({ ...INITIAL_BOTTOM_SHEET_DRAG_STATE });
        invokeCloseOnce();
        hasClosedCurrentDismiss = false;
        return;
      }

      setState({
        isDragging: false,
        isSnappingBack: false,
        isDismissing: true,
        dragOffsetY: deltaY,
      });

      dismissTimer = env.scheduleTimeout(() => {
        dismissTimer = null;
        invokeCloseOnce();
        setState({ ...INITIAL_BOTTOM_SHEET_DRAG_STATE });
        hasClosedCurrentDismiss = false;
      }, DISMISS_DURATION_MS);
    },

    onPointerCancel: (e) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;
      const pointerId = activePointerId;
      const currentTarget = e.currentTarget;
      const wasCaptured = captured;
      const wasActivated = activated;

      resetTracking();
      if (wasCaptured) {
        releaseCaptureSafely(currentTarget, pointerId);
      }

      if (!wasActivated) return;
      e.stopPropagation();
      triggerSnapBack();
    },

    onLostPointerCapture: (e) => {
      if (activePointerId === null || e.pointerId !== activePointerId) return;
      const wasActivated = activated;
      resetTracking();
      if (!wasActivated) return;
      e.stopPropagation();
      triggerSnapBack();
    },
  };

  function cancelActiveDrag() {
    const wasActivated = activated;
    resetTracking();
    if (wasActivated) {
      triggerSnapBack();
    }
  }

  function updateOptions(
    next: Partial<UseBottomSheetDragToDismissOptions>
  ) {
    if (next.onClose !== undefined) onClose = next.onClose;
    if (next.thresholdPx !== undefined) thresholdPx = next.thresholdPx;
    if (next.velocityThreshold !== undefined) {
      velocityThreshold = next.velocityThreshold;
    }
    if (next.disabled !== undefined) {
      disabled = Boolean(next.disabled);
      if (disabled && activePointerId !== null) {
        cancelActiveDrag();
      }
    }
  }

  function cleanup() {
    clearSnapBackTimer();
    clearDismissTimer();
    resetTracking();
    hasClosedCurrentDismiss = false;
  }

  return {
    handlers,
    updateOptions,
    cancelActiveDrag,
    cleanup,
    getState: () => state,
  };
}

/**
 * Shared pointer-based mobile drag-to-dismiss hook for bottom-sheet modals.
 * Bind `dragHandleProps` strictly to the mobile grab handle and sticky header;
 * never attach them to scrollable modal bodies.
 */
export function useBottomSheetDragToDismiss({
  onClose,
  disabled = false,
  thresholdPx = 90,
  velocityThreshold = 0.45,
}: UseBottomSheetDragToDismissOptions): UseBottomSheetDragToDismissResult {
  const [dragState, setDragState] = useState<BottomSheetDragState>(
    INITIAL_BOTTOM_SHEET_DRAG_STATE
  );

  const controllerRef = useRef<BottomSheetDragController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createBottomSheetDragController({
      onClose,
      disabled,
      thresholdPx,
      velocityThreshold,
      onStateChange: setDragState,
    });
  }

  useEffect(() => {
    controllerRef.current?.updateOptions({
      onClose,
      disabled,
      thresholdPx,
      velocityThreshold,
    });
  }, [onClose, disabled, thresholdPx, velocityThreshold]);

  useEffect(() => {
    return () => {
      controllerRef.current?.cleanup();
    };
  }, []);

  const dragHandleProps = useMemo<BottomSheetDragHandleProps>(
    () => ({
      onPointerDown: (e) => controllerRef.current?.handlers.onPointerDown(e),
      onPointerMove: (e) => controllerRef.current?.handlers.onPointerMove(e),
      onPointerUp: (e) => controllerRef.current?.handlers.onPointerUp(e),
      onPointerCancel: (e) =>
        controllerRef.current?.handlers.onPointerCancel(e),
      onLostPointerCapture: (e) =>
        controllerRef.current?.handlers.onLostPointerCapture(e),
    }),
    []
  );

  const sheetStyle = useMemo(
    () => buildBottomSheetStyle(dragState),
    [dragState]
  );

  return {
    sheetStyle,
    dragHandleProps,
    isDragging: dragState.isDragging,
    dragOffsetY: dragState.dragOffsetY,
  };
}
