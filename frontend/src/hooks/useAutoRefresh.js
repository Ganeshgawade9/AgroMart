import { useEffect, useRef } from 'react';

const MIN_GAP_MS = 2000;

// Calls `callback` every `interval` ms while the browser tab is visible, and once more
// when the user comes back to the tab. Used to keep stock and prices live without a reload.
export default function useAutoRefresh(callback, { interval = 30000, enabled = true } = {}) {
  const saved = useRef(callback);
  const lastRun = useRef(Date.now());

  useEffect(() => { saved.current = callback; });

  useEffect(() => {
    if (!enabled) return undefined;

    const run = (force = false) => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      // focus + visibilitychange often fire together; avoid double requests
      if (!force && now - lastRun.current < MIN_GAP_MS) return;
      lastRun.current = now;
      saved.current();
    };

    const timer = setInterval(() => run(true), interval);
    const onWake = () => run(false);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [interval, enabled]);
}
