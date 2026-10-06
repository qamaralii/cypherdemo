import { useCallback, useEffect, useRef, useState } from 'react';
type TimedItem = { appear: number; disappear: number };

/**
 * Synchronises overlay visibility to a <video> element's currentTime.
 * Uses requestAnimationFrame so it stays accurate through pause/seek.
 * Only runs the RAF loop when the video element exists.
 */
export function useVideoSync<T extends TimedItem>(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  items: readonly T[],
) {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);

  const tick = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      // Stop the loop — it will be restarted when needed
      runningRef.current = false;
      return;
    }
    const t = video.currentTime;
    const visible = items.filter((item) => t >= item.appear && t < item.disappear);
    setCurrentTime(t);
    setVisibleItems((prev) => {
      if (
        prev.length === visible.length &&
        prev.every((item, i) => item === visible[i])
      ) {
        return prev;
      }
      return visible;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, [videoRef, items]);

  // Start/restart the RAF loop
  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    startLoop();

    // Also listen for the video to become available (e.g. after loading)
    const checkInterval = setInterval(() => {
      if (videoRef.current && !runningRef.current) {
        startLoop();
      }
    }, 200);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(checkInterval);
      runningRef.current = false;
    };
  }, [startLoop, videoRef]);

  return { visibleItems, currentTime };
}
