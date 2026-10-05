const TAP_MAX_DISTANCE = 12;
const TAP_MAX_DURATION_MS = 320;
const SWIPE_MIN_DISTANCE = 56;
const SWIPE_AXIS_RATIO = 1.3;

// Tap toggles the controls, horizontal swipe switches scenes, vertical swipe switches
// presets. Swipe left / up means "next".
export function installTouchGestures(element, { onTap, onSwipeHorizontal, onSwipeVertical }) {
  let start = null;

  const handlePointerDown = (event) => {
    if (!event.isPrimary) {
      return;
    }

    start = { x: event.clientX, y: event.clientY, time: performance.now(), id: event.pointerId };
  };

  const handlePointerUp = (event) => {
    if (!start || event.pointerId !== start.id) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const duration = performance.now() - start.time;
    start = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < TAP_MAX_DISTANCE && absY < TAP_MAX_DISTANCE && duration < TAP_MAX_DURATION_MS) {
      onTap?.();
      return;
    }

    if (absX >= SWIPE_MIN_DISTANCE && absX > absY * SWIPE_AXIS_RATIO) {
      onSwipeHorizontal?.(dx < 0 ? 1 : -1);
      return;
    }

    if (absY >= SWIPE_MIN_DISTANCE && absY > absX * SWIPE_AXIS_RATIO) {
      onSwipeVertical?.(dy < 0 ? 1 : -1);
    }
  };

  const handlePointerCancel = () => {
    start = null;
  };

  element.addEventListener('pointerdown', handlePointerDown);
  element.addEventListener('pointerup', handlePointerUp);
  element.addEventListener('pointercancel', handlePointerCancel);

  return () => {
    element.removeEventListener('pointerdown', handlePointerDown);
    element.removeEventListener('pointerup', handlePointerUp);
    element.removeEventListener('pointercancel', handlePointerCancel);
  };
}
