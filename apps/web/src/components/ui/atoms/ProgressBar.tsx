import React from 'react';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'brand' | 'primary' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  variant = 'brand',
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(Math.max(0, Math.round((value / max) * 100)), 100);

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantStyles = {
    brand: 'bg-[#B1E743] dark:bg-[#B1E743]',
    primary: 'bg-[#B1E743] dark:bg-[#B1E743]',
    emerald: 'bg-emerald-500 dark:bg-emerald-400',
    indigo: 'bg-[#B1E743] dark:bg-[#B1E743]',
    amber: 'bg-amber-400 dark:bg-amber-400',
    rose: 'bg-rose-500 dark:bg-rose-400',
    neutral: 'bg-stone-400 dark:bg-stone-600',
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs font-semibold text-stone-700 dark:text-stone-300">
          {label ? <span>{label}</span> : <span />}
          {showPercentage && <span className="font-mono">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 ${sizeStyles[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${variantStyles[variant] || variantStyles.brand}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};
