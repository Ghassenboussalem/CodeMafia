import { useState, useEffect, useRef } from 'react';

/**
 * Client-side countdown timer.
 * Syncs from a server value whenever `serverSeconds` changes.
 * Returns { seconds, urgent } where urgent = seconds <= threshold.
 */
export default function useTimer(serverSeconds, threshold = 10) {
  const [seconds, setSeconds] = useState(serverSeconds);
  const intervalRef = useRef(null);

  // Reset whenever the server pushes a new value
  useEffect(() => {
    setSeconds(serverSeconds);
  }, [serverSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      clearInterval(intervalRef.current);
      return;
    }
    // Tick locally between server updates to keep display smooth
    intervalRef.current = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [seconds]);

  return { seconds, urgent: seconds <= threshold };
}
