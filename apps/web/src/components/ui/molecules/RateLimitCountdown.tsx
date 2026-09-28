import React, { useEffect, useRef, useState } from 'react';
import type { RateLimitInfo } from '../../../lib/api/apiClient';

const getRemainingSeconds = (resetAt?: number) =>
  resetAt === undefined ? undefined : Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export interface RateLimitCountdownProps {
  rateLimit: RateLimitInfo;
  onComplete?: () => void;
}

/** Accessible, server-timed feedback for an exhausted request quota. */
export const RateLimitCountdown: React.FC<RateLimitCountdownProps> = ({
  rateLimit,
  onComplete,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    getRemainingSeconds(rateLimit.resetAt),
  );
  const hasCompleted = useRef(false);
  const isBlocked = rateLimit.remaining === 0;

  useEffect(() => {
    hasCompleted.current = false;
    if (!isBlocked || rateLimit.resetAt === undefined) return undefined;

    const update = () => {
      const next = getRemainingSeconds(rateLimit.resetAt);
      setSecondsRemaining(next);
      if (isBlocked && next === 0 && !hasCompleted.current) {
        hasCompleted.current = true;
        onComplete?.();
      }
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [isBlocked, onComplete, rateLimit.resetAt]);

  const quota =
    rateLimit.limit !== undefined
      ? `Sisa kuota: ${rateLimit.remaining ?? 0} dari ${rateLimit.limit}. `
      : 'Sisa kuota saat ini belum tersedia. ';
  const wait = !isBlocked
    ? 'Anda masih dapat mencoba lagi.'
    : secondsRemaining === undefined
      ? 'Silakan coba lagi beberapa saat.'
      : secondsRemaining === 0
        ? 'Anda dapat mencoba lagi sekarang.'
        : `Coba lagi dalam ${formatDuration(secondsRemaining)}.`;

  return (
    <span aria-live="polite" role="status">
      {quota}
      {wait}
    </span>
  );
};
