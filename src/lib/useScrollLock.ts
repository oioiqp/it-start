import { useEffect } from 'react';

let lockCount = 0;
let prevBodyOverflow = '';
let prevBodyTouchAction = '';
let prevHtmlOverflow = '';
let prevBodyPaddingRight = '';

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Prevents mobile background scroll thrashing, GPU overdraw, and layout shift.
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock || typeof document === 'undefined') return;

    if (lockCount === 0) {
      prevBodyOverflow = document.body.style.overflow;
      prevBodyTouchAction = document.body.style.touchAction;
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevBodyPaddingRight = document.body.style.paddingRight;

      // Compensate for scrollbar disappearance on desktop to avoid layout shift
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.classList.add('modal-open');
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = prevBodyOverflow;
        document.body.style.touchAction = prevBodyTouchAction;
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.paddingRight = prevBodyPaddingRight;
        document.documentElement.classList.remove('modal-open');
      }
    };
  }, [lock]);
}
