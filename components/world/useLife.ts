'use client';

import { useEffect, useState } from 'react';

/**
 * Provides a ~13fps simulation clock tick aligned with optional server clock offset,
 * without synchronous setState inside useEffect body (fixes react-hooks/set-state-in-effect).
 */
export function useLifeClock(paused: boolean, clockOffsetMs = 0): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let frame = 0;
    let last = 0;

    const tick = (time: number) => {
      if (last === 0 || time - last > 75) {
        setNow(Date.now() + clockOffsetMs);
        last = time;
      }
      if (!paused) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, clockOffsetMs]);

  return now;
}
