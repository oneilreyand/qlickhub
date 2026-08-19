import React, { useEffect, useState, useRef } from 'react';

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (val: number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 800,
  prefix = '',
  suffix = '',
  className = '',
  formatter,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(() => (value > 0 ? 0 : value));
  const prevValueRef = useRef<number>(value > 0 ? 0 : value);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || value <= 0) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = Date.now();

    // Ease-out cubic for smooth deceleration
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = Math.round(startValue + (endValue - startValue) * easedProgress);
      setDisplayValue(current);

      if (progress >= 1) {
        window.clearInterval(timer);
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    }, 16);

    return () => {
      window.clearInterval(timer);
    };
  }, [value, duration]);

  const formattedText = formatter ? formatter(displayValue) : displayValue.toLocaleString();

  return (
    <span className={className}>
      {prefix}{formattedText}{suffix}
    </span>
  );
};
