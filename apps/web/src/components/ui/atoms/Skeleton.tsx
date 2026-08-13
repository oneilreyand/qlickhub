import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'h-10 w-10 rounded-full',
    rectangular: 'h-24 w-full rounded-2xl',
  };

  return (
    <div
      className={`animate-pulse bg-stone-200 dark:bg-stone-800 ${variantStyles[variant]} ${className}`}
    />
  );
};
