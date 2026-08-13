import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  shortcut?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, shortcut, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 text-stone-400 dark:text-stone-500">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`min-h-[44px] w-full rounded-xl border bg-stone-50 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:border-[#22201F] focus:bg-white focus:ring-2 focus:ring-[#22201F]/10 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-[#B1E743] dark:focus:bg-stone-950 dark:focus:ring-[#B1E743]/20 ${
              leftIcon ? 'pl-9' : 'pl-3.5'
            } ${shortcut ? 'pr-12' : 'pr-3.5'} ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-stone-200 dark:border-stone-800'
            } ${className}`}
            {...props}
          />
          {shortcut && (
            <div className="pointer-events-none absolute right-3 flex items-center">
              <kbd className="rounded border border-stone-200 bg-white px-1.5 font-mono text-[10px] font-medium text-stone-400 shadow-xs dark:border-stone-800 dark:bg-stone-900 dark:text-stone-500">
                {shortcut}
              </kbd>
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
