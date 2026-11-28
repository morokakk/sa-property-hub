import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  buildBottomSheetStyle,
  createBottomSheetDragController,
  DragPointerEventLike,
  INITIAL_BOTTOM_SHEET_DRAG_STATE,
  BottomSheetDragState,
} from '../useBottomSheetDragToDismiss';
import BottomSheetHandle from '@/components/common/BottomSheetHandle';

function makePointerEvent(
  overrides: Partial<DragPointerEventLike> & {
    closestMatch?: boolean;
  } = {}
): DragPointerEventLike & {
  setPointerCapture: ReturnType<typeof vi.fn>;
  releasePointerCapture: ReturnType<typeof vi.fn>;
} {
  const setPointerCapture = vi.fn();
  const releasePointerCapture = vi.fn();
  let captured = false;

  const currentTarget = {
    setPointerCapture: (id: number) => {
      captured = true;
      setPointerCapture(id);
    },
    releasePointerCapture: (id: number) => {
      captured = false;
      releasePointerCapture(id);
    },
    hasPointerCapture: () => captured,
  };

  const target = {
    closest: vi.fn(() => (overrides.closestMatch ? ({} as Element) : null)),
  };

  return {
    button: overrides.button ?? 0,
    clientY: overrides.clientY ?? 0,
    pointerId: overrides.pointerId ?? 1,
    target:
      overrides.target !== undefined
        ? overrides.target
        : (target as unknown as EventTarget),
    currentTarget:
      overrides.currentTarget !== undefined
        ? overrides.currentTarget
        : (currentTarget as unknown as DragPointerEventLike['currentTarget']),
    stopPropagation: overrides.stopPropagation ?? vi.fn(),
    preventDefault: overrides.preventDefault ?? vi.fn(),
    setPointerCapture,
    releasePointerCapture,
  };
}

describe('useBottomSheetDragToDismiss controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(opts?: {
    disabled?: boolean;
    viewportWidth?: number;
    reducedMotion?: boolean;
    thresholdPx?: number;
    velocityThreshold?: number;
  }) {
    let nowMs = 1000;
    let state: BottomSheetDragState = { ...INITIAL_BOTTOM_SHEET_DRAG_STATE };
    const states: BottomSheetDragState[] = [];
    const onClose = vi.fn();

    const controller = createBottomSheetDragController({
      onClose,
      disabled: opts?.disabled ?? false,
      thresholdPx: opts?.thresholdPx ?? 90,
      velocityThreshold: opts?.velocityThreshold ?? 0.45,
      onStateChange: (next) => {
        state = next;
        states.push(next);
      },
      env: {
        getViewportWidth: () => opts?.viewportWidth ?? 390,
        prefersReducedMotion: () => opts?.reducedMotion ?? false,
        now: () => nowMs,
      },
    });

    return {
      controller,
      onClose,
      getState: () => state,
      getStates: () => states,
      advanceTime: (ms: number) => {
        nowMs += ms;
      },
    };
  }

  it('snaps back to translateY(0) and does NOT call onClose when dragged slowly below threshold (40px)', () => {
    const { controller, onClose, getState, advanceTime } = setup();

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    advanceTime(150);
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 140 }));

    expect(getState()).toEqual({
      isDragging: true,
      isSnappingBack: false,
      isDismissing: false,
      dragOffsetY: 40,
    });
    expect(buildBottomSheetStyle(getState())).toEqual({
      transform: 'translateY(40px)',
      transition: 'none',
      willChange: 'transform',
    });

    advanceTime(250); // total 400ms -> velocity 0.1 px/ms
    controller.handlers.onPointerUp(makePointerEvent({ clientY: 140 }));

    expect(onClose).not.toHaveBeenCalled();
    expect(getState().isDragging).toBe(false);
    expect(getState().isSnappingBack).toBe(true);
    expect(getState().dragOffsetY).toBe(0);
    expect(buildBottomSheetStyle(getState()).transform).toBe('translateY(0px)');

    vi.advanceTimersByTime(200);
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
    expect(buildBottomSheetStyle(getState())).toEqual({});
  });

  it('calls onClose exactly once after 150ms dismiss animation when dragged past threshold (110px)', () => {
    const { controller, onClose, getState, advanceTime } = setup();

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    advanceTime(300);
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 210 }));
    expect(getState().dragOffsetY).toBe(110);

    advanceTime(200);
    controller.handlers.onPointerUp(makePointerEvent({ clientY: 210 }));

    expect(onClose).not.toHaveBeenCalled();
    expect(getState().isDismissing).toBe(true);
    expect(buildBottomSheetStyle(getState())).toEqual({
      transform: 'translateY(100%)',
      transition: 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)',
      willChange: 'transform',
    });

    vi.advanceTimersByTime(150);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
  });

  it('calls onClose on fast downward flick (45px in 50ms)', () => {
    const { controller, onClose, advanceTime } = setup();

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    advanceTime(25);
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 130 }));
    advanceTime(25);
    controller.handlers.onPointerUp(makePointerEvent({ clientY: 145 }));

    vi.advanceTimersByTime(150);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose immediately without 150ms delay when prefers-reduced-motion is enabled', () => {
    const { controller, onClose, getState, advanceTime } = setup({
      reducedMotion: true,
    });

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    advanceTime(200);
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 220 }));
    controller.handlers.onPointerUp(makePointerEvent({ clientY: 220 }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
  });

  it('ignores pointerdown on interactive header children (<button>, <a>, <input>, [data-no-drag])', () => {
    const { controller, onClose, getState, advanceTime } = setup();

    controller.handlers.onPointerDown(
      makePointerEvent({ clientY: 100, closestMatch: true })
    );
    advanceTime(50);
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 250 }));
    controller.handlers.onPointerUp(makePointerEvent({ clientY: 250 }));

    vi.advanceTimersByTime(200);
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores drag gestures on desktop viewports (>= 640px)', () => {
    for (const width of [640, 1280]) {
      const { controller, onClose, getState, advanceTime } = setup({
        viewportWidth: width,
      });

      controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
      advanceTime(40);
      controller.handlers.onPointerMove(makePointerEvent({ clientY: 240 }));
      controller.handlers.onPointerUp(makePointerEvent({ clientY: 240 }));

      vi.advanceTimersByTime(200);
      expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('blocks dragging and dismissal when disabled=true', () => {
    const { controller, onClose, getState, advanceTime } = setup({
      disabled: true,
    });

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    advanceTime(40);
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 240 }));
    controller.handlers.onPointerUp(makePointerEvent({ clientY: 240 }));

    vi.advanceTimersByTime(200);
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels active drag and snaps back if disabled becomes true mid-drag', () => {
    const { controller, onClose, getState, advanceTime } = setup();

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    advanceTime(50);
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 160 }));
    expect(getState().isDragging).toBe(true);

    controller.updateOptions({ disabled: true });
    expect(getState().isDragging).toBe(false);
    expect(getState().isSnappingBack).toBe(true);

    vi.advanceTimersByTime(200);
    expect(onClose).not.toHaveBeenCalled();
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
  });

  it('respects 6px deadzone and clamps upward pulls to 0', () => {
    const { controller, getState } = setup();
    const downEvt = makePointerEvent({ clientY: 100 });
    controller.handlers.onPointerDown(downEvt);

    // Within 6px deadzone -> does not activate or capture pointer
    const smallMove = makePointerEvent({
      clientY: 106,
      currentTarget: downEvt.currentTarget,
    });
    controller.handlers.onPointerMove(smallMove);
    expect(getState().isDragging).toBe(false);
    expect(downEvt.setPointerCapture).not.toHaveBeenCalled();

    // Past 6px deadzone -> activates and captures pointer
    const activeMove = makePointerEvent({
      clientY: 112,
      currentTarget: downEvt.currentTarget,
    });
    controller.handlers.onPointerMove(activeMove);
    expect(getState().isDragging).toBe(true);
    expect(getState().dragOffsetY).toBe(12);
    expect(activeMove.stopPropagation).toHaveBeenCalledTimes(1);

    // Upward pull past startY clamps to 0
    const upwardMove = makePointerEvent({
      clientY: 40,
      currentTarget: downEvt.currentTarget,
    });
    controller.handlers.onPointerMove(upwardMove);
    expect(getState().isDragging).toBe(true);
    expect(getState().dragOffsetY).toBe(0);
    expect(buildBottomSheetStyle(getState()).transform).toBe('translateY(0px)');
  });

  it('snaps back on pointercancel without calling onClose and isolates nested events', () => {
    const { controller, onClose, getState } = setup();

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    const moveEvt = makePointerEvent({ clientY: 180 });
    controller.handlers.onPointerMove(moveEvt);
    expect(moveEvt.stopPropagation).toHaveBeenCalledTimes(1);

    const cancelEvt = makePointerEvent({ clientY: 180 });
    controller.handlers.onPointerCancel(cancelEvt);
    expect(cancelEvt.stopPropagation).toHaveBeenCalledTimes(1);
    expect(getState().isDragging).toBe(false);
    expect(getState().isSnappingBack).toBe(true);

    vi.advanceTimersByTime(200);
    expect(onClose).not.toHaveBeenCalled();
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
  });

  it('snaps back on unexpected lostpointercapture mid-drag without calling onClose', () => {
    const { controller, onClose, getState } = setup();

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 185 }));
    expect(getState().isDragging).toBe(true);

    const lostEvt = makePointerEvent({ clientY: 185 });
    controller.handlers.onLostPointerCapture(lostEvt);

    expect(lostEvt.stopPropagation).toHaveBeenCalledTimes(1);
    expect(getState().isDragging).toBe(false);
    expect(getState().isSnappingBack).toBe(true);
    expect(getState().dragOffsetY).toBe(0);
    expect(buildBottomSheetStyle(getState()).transform).toBe('translateY(0px)');

    vi.advanceTimersByTime(200);
    expect(onClose).not.toHaveBeenCalled();
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
    expect(buildBottomSheetStyle(getState())).toEqual({});
  });

  it('ignores lostpointercapture emitted after normal pointerup dismiss', () => {
    const { controller, onClose, getState, advanceTime } = setup();

    controller.handlers.onPointerDown(makePointerEvent({ clientY: 100 }));
    advanceTime(200);
    controller.handlers.onPointerMove(makePointerEvent({ clientY: 220 }));
    controller.handlers.onPointerUp(makePointerEvent({ clientY: 220 }));

    expect(getState().isDismissing).toBe(true);

    // Browser fires lostpointercapture after pointerup releases capture
    const lostAfterUp = makePointerEvent({ clientY: 220 });
    controller.handlers.onLostPointerCapture(lostAfterUp);

    expect(lostAfterUp.stopPropagation).not.toHaveBeenCalled();
    expect(getState().isDismissing).toBe(true);

    vi.advanceTimersByTime(150);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getState()).toEqual(INITIAL_BOTTOM_SHEET_DRAG_STATE);
  });
});

describe('BottomSheetHandle component', () => {
  it('renders mobile-only light handle with aria-hidden and touch-none', () => {
    const html = renderToString(<BottomSheetHandle />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-testid="bottom-sheet-handle"');
    expect(html).toContain('sm:hidden');
    expect(html).toContain('touch-none');
    expect(html).toContain('bg-slate-300/90');
    expect(html).not.toContain('bg-slate-900');
  });

  it('renders dark-header handle when tone="dark"', () => {
    const html = renderToString(<BottomSheetHandle tone="dark" />);
    expect(html).toContain('bg-slate-900');
    expect(html).toContain('bg-slate-600/80');
    expect(html).toContain('sm:hidden');
  });
});
