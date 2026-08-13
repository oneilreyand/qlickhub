import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'brand' | 'white' | 'stone';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'brand',
  className = '',
  label,
}) => {
  const sizeStyles = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-[3px]',
    xl: 'h-12 w-12 border-4',
  };

  const variantStyles = {
    brand: 'border-[#22201F] border-t-transparent dark:border-[#B1E743] dark:border-t-transparent',
    white: 'border-white border-t-transparent',
    stone: 'border-stone-400 border-t-transparent dark:border-stone-500 dark:border-t-transparent',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`animate-spin rounded-full ${sizeStyles[size]} ${variantStyles[variant]}`}
        role="status"
        aria-label="loading"
      />
      {label && <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{label}</span>}
    </div>
  );
};

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading data...',
  children,
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/80 backdrop-blur-xs transition-opacity dark:bg-[#141413]/80">
          <LoadingSpinner size="lg" variant="brand" />
          {message && <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{message}</p>}
        </div>
      )}
    </div>
  );
};
