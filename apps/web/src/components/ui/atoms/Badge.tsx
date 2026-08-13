import React from 'react';

export interface BadgeProps {
  variant?: 'passed' | 'review' | 'blocked' | 'draft' | 'info' | 'neutral';
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
    passed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    review: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    blocked: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    draft: 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800/80 dark:text-stone-300 dark:border-stone-700',
    info: 'bg-[#22201F] text-white border-[#22201F] dark:bg-[#B1E743] dark:text-[#22201F] dark:border-[#B1E743]',
    neutral: 'bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {icon ? icon : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      <span>{children}</span>
    </span>
  );
};
