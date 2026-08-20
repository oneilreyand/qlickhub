import React from 'react';

export interface BadgeProps {
  variant?: 'passed' | 'brand' | 'review' | 'blocked' | 'draft' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  children,
  icon,
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 font-semibold rounded-full border transition-colors whitespace-nowrap shrink-0';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantStyles = {
    brand: 'bg-[#B1E743]/20 text-[#141413] border-[#B1E743]/50 dark:bg-[#B1E743]/20 dark:text-[#B1E743] dark:border-[#B1E743]/40',
    passed: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
    review: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
    blocked: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
    draft: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/90 dark:text-stone-300 dark:border-stone-700',
    info: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800/80 dark:text-stone-200 dark:border-stone-700',
    neutral: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/80 dark:text-stone-300 dark:border-stone-700',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {icon ? (
        <span className="inline-flex items-center justify-center shrink-0 leading-none">{icon}</span>
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      <span className="inline-flex items-center justify-center leading-normal">{children}</span>
    </span>
  );
};
