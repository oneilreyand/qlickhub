import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  shortcut?: string;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      shortcut,
      showPasswordToggle,
      className = '',
      id,
      type = 'text',
      disabled,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const isPasswordType = type === 'password';
    const hasPasswordToggle = isPasswordType && showPasswordToggle !== false;
    const computedType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    const hasRightContent = hasPasswordToggle || Boolean(rightIcon) || Boolean(shortcut);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center text-stone-400 dark:text-stone-500">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={computedType}
            disabled={disabled}
            className={`min-h-[44px] w-full rounded-xl border bg-stone-50 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:bg-stone-950 dark:focus:ring-brand-500/20 ${
              leftIcon ? 'pl-9' : 'pl-3.5'
            } ${shortcut ? 'pr-12' : hasRightContent ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-stone-200 dark:border-stone-800'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
            {...props}
          />
          {hasPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={disabled}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 flex items-center justify-center p-1 rounded-md text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 focus:outline-hidden transition-colors disabled:opacity-50 disabled:pointer-events-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
          {rightIcon && !hasPasswordToggle && !shortcut && (
            <div className="pointer-events-none absolute right-3 flex items-center text-stone-400 dark:text-stone-500">
              {rightIcon}
            </div>
          )}
          {shortcut && !hasPasswordToggle && (
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
  },
);

Input.displayName = 'Input';
