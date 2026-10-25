import { useEffect } from 'react';

let lockCount = 0;
let prevBodyOverflow = '';
let prevBodyTouchAction = '';
let prevHtmlOverflow = '';

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Prevents mobile background scroll thrashing and GPU overdraw.
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock || typeof document === 'undefined') return;

    if (lockCount === 0) {
      prevBodyOverflow = document.body.style.overflow;
      prevBodyTouchAction = document.body.style.touchAction;
      prevHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = prevBodyOverflow;
        document.body.style.touchAction = prevBodyTouchAction;
        document.documentElement.style.overflow = prevHtmlOverflow;
      }
    };
  }, [lock]);
}
