import { describe, it, expect, vi } from 'vitest';
import {
  createBackdropDismissHandlers,
  BackdropDismissState,
} from '../useModalBackdropDismiss';

function makeEvent(target: object, currentTarget: object) {
  return {
    target: target as unknown as EventTarget,
    currentTarget: currentTarget as unknown as EventTarget,
    stopPropagation: vi.fn(),
  };
}

describe('createBackdropDismissHandlers', () => {
  it('closes when pointerdown, pointerup, and click all occur directly on the backdrop', () => {
    const state: BackdropDismissState = { startedOnBackdrop: false, endedOnBackdrop: false };
    const onClose = vi.fn();
    const handlers = createBackdropDismissHandlers(state, onClose, false);
    const backdrop = { id: 'backdrop' };

    const downEvt = makeEvent(backdrop, backdrop);
    const upEvt = makeEvent(backdrop, backdrop);
    const clickEvt = makeEvent(backdrop, backdrop);

    handlers.onPointerDown(downEvt);
    handlers.onPointerUp(upEvt);
    handlers.onClick(clickEvt);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(clickEvt.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('does NOT close on text-selection drag-out (pointerdown inside input, pointerup + click on backdrop)', () => {
    const state: BackdropDismissState = { startedOnBackdrop: false, endedOnBackdrop: false };
    const onClose = vi.fn();
    const handlers = createBackdropDismissHandlers(state, onClose, false);
    const backdrop = { id: 'backdrop' };
    const input = { id: 'input' };

    const downEvt = makeEvent(input, backdrop);
    const upEvt = makeEvent(backdrop, backdrop);
    const clickEvt = makeEvent(backdrop, backdrop);

    handlers.onPointerDown(downEvt);
    handlers.onPointerUp(upEvt);
    handlers.onClick(clickEvt);

    expect(onClose).not.toHaveBeenCalled();
    expect(clickEvt.stopPropagation).toHaveBeenCalledTimes(1);

    // Subsequent genuine click on backdrop still works after state reset
    const genuineDown = makeEvent(backdrop, backdrop);
    const genuineUp = makeEvent(backdrop, backdrop);
    const genuineClick = makeEvent(backdrop, backdrop);
    handlers.onPointerDown(genuineDown);
    handlers.onPointerUp(genuineUp);
    handlers.onClick(genuineClick);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close on drag-in (pointerdown on backdrop, pointerup inside child, click on backdrop)', () => {
    const state: BackdropDismissState = { startedOnBackdrop: false, endedOnBackdrop: false };
    const onClose = vi.fn();
    const handlers = createBackdropDismissHandlers(state, onClose, false);
    const backdrop = { id: 'backdrop' };
    const panelChild = { id: 'panel-child' };

    handlers.onPointerDown(makeEvent(backdrop, backdrop));
    handlers.onPointerUp(makeEvent(panelChild, backdrop));
    const clickEvt = makeEvent(backdrop, backdrop);
    handlers.onClick(clickEvt);

    expect(onClose).not.toHaveBeenCalled();
    expect(clickEvt.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when clicking inside the modal panel', () => {
    const state: BackdropDismissState = { startedOnBackdrop: false, endedOnBackdrop: false };
    const onClose = vi.fn();
    const handlers = createBackdropDismissHandlers(state, onClose, false);
    const backdrop = { id: 'backdrop' };
    const panel = { id: 'panel' };

    handlers.onPointerDown(makeEvent(panel, backdrop));
    handlers.onPointerUp(makeEvent(panel, backdrop));
    const clickEvt = makeEvent(panel, backdrop);
    handlers.onClick(clickEvt);

    expect(onClose).not.toHaveBeenCalled();
    expect(clickEvt.stopPropagation).not.toHaveBeenCalled();
  });

  it('blocks closing when disabled=true (async in-flight guard) and allows once disabled=false', () => {
    const state: BackdropDismissState = { startedOnBackdrop: false, endedOnBackdrop: false };
    const onClose = vi.fn();
    const backdrop = { id: 'backdrop' };

    const disabledHandlers = createBackdropDismissHandlers(state, onClose, true);
    disabledHandlers.onPointerDown(makeEvent(backdrop, backdrop));
    disabledHandlers.onPointerUp(makeEvent(backdrop, backdrop));
    const blockedClick = makeEvent(backdrop, backdrop);
    disabledHandlers.onClick(blockedClick);

    expect(onClose).not.toHaveBeenCalled();
    expect(blockedClick.stopPropagation).toHaveBeenCalledTimes(1);

    const enabledHandlers = createBackdropDismissHandlers(state, onClose, false);
    enabledHandlers.onPointerDown(makeEvent(backdrop, backdrop));
    enabledHandlers.onPointerUp(makeEvent(backdrop, backdrop));
    enabledHandlers.onClick(makeEvent(backdrop, backdrop));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('isolates nested modal backdrop clicks and drag-outs from closing parent modal', () => {
    const parentState: BackdropDismissState = { startedOnBackdrop: false, endedOnBackdrop: false };
    const childState: BackdropDismissState = { startedOnBackdrop: false, endedOnBackdrop: false };
    const onCloseParent = vi.fn();
    const onCloseChild = vi.fn();
    const parentHandlers = createBackdropDismissHandlers(parentState, onCloseParent, false);
    const childHandlers = createBackdropDismissHandlers(childState, onCloseChild, false);

    const parentBackdrop = { id: 'parent-backdrop' };
    const childBackdrop = { id: 'child-backdrop' };
    const childInput = { id: 'child-input' };

    // 1. Clicking child backdrop closes child only (child stops propagation before parent sees click)
    parentHandlers.onPointerDown(makeEvent(childBackdrop, parentBackdrop));
    childHandlers.onPointerDown(makeEvent(childBackdrop, childBackdrop));

    parentHandlers.onPointerUp(makeEvent(childBackdrop, parentBackdrop));
    childHandlers.onPointerUp(makeEvent(childBackdrop, childBackdrop));

    const childClick = makeEvent(childBackdrop, childBackdrop);
    childHandlers.onClick(childClick);
    expect(childClick.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onCloseChild).toHaveBeenCalledTimes(1);
    expect(onCloseParent).not.toHaveBeenCalled();

    // 2. Dragging out of child input onto child backdrop closes neither child nor parent
    parentHandlers.onPointerDown(makeEvent(childInput, parentBackdrop));
    childHandlers.onPointerDown(makeEvent(childInput, childBackdrop));

    parentHandlers.onPointerUp(makeEvent(childBackdrop, parentBackdrop));
    childHandlers.onPointerUp(makeEvent(childBackdrop, childBackdrop));

    const dragOutClick = makeEvent(childBackdrop, childBackdrop);
    childHandlers.onClick(dragOutClick);
    expect(dragOutClick.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onCloseChild).toHaveBeenCalledTimes(1);
    expect(onCloseParent).not.toHaveBeenCalled();
  });
});
