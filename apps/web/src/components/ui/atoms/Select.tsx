import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`min-h-[44px] w-full rounded-xl border bg-stone-50 px-3.5 text-sm text-stone-900 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-brand-500 dark:focus:bg-stone-950 dark:focus:ring-brand-500/20 ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-stone-200 dark:border-stone-800'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
