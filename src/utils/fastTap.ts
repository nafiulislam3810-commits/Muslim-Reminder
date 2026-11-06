import React from 'react';

/**
 * Fast Tap Handler for Mobile WebViews.
 * 
 * On Android WebViews, when momentum/inertial scrolling is active, Chromium consumes
 * the standard synthetic `click` event as a "scroll stop" / "fling cancel" gesture.
 * 
 * By monitoring touch/pointer contact (pointerdown -> pointerup with < 14px delta)
 * and deduplicating with synthetic clicks, this guarantees that tapping a function
 * or tab while the screen is scrolling responds immediately on the very first touch.
 * 
 * CRITICAL: Module-level timestamp prevents synthetic clicks from double-firing
 * even when components re-render between pointerup and click events.
 */
let globalLastHandledTapTime = 0;

export function fastTap(callback: () => void) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  return {
    onPointerDown: (e: React.PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
    },
    onPointerUp: (e: React.PointerEvent) => {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      const elapsed = Date.now() - startTime;
      if (dist < 14 && elapsed < 450) {
        const now = Date.now();
        if (now - globalLastHandledTapTime < 350) return;
        globalLastHandledTapTime = now;
        callback();
      }
    },
    onClick: (e: React.MouseEvent) => {
      const now = Date.now();
      // If pointerUp just processed a tap within 450ms, swallow the synthetic click completely
      if (now - globalLastHandledTapTime < 450) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      globalLastHandledTapTime = now;
      callback();
    }
  };
}
