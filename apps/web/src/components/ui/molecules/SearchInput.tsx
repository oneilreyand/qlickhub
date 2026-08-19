import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  shortcut?: string;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      label,
      error,
      shortcut,
      onClear,
      showClearButton = true,
      placeholder = 'Search...',
      value,
      onChange,
      className = '',
      id,
      disabled,
      'aria-label': ariaLabel = 'Search',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const hasValue = Boolean(value !== undefined && value !== null && String(value).length > 0);

    const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (onClear) {
        onClear();
      } else if (onChange) {
        const syntheticEvent = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 grid place-items-center text-stone-400 dark:text-stone-500">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            id={inputId}
            ref={ref}
            type="text"
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className={`min-h-[44px] w-full rounded-xl border bg-stone-50 pl-10 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:bg-stone-950 dark:focus:ring-brand-500/20 ${
              hasValue && showClearButton ? 'pr-10' : shortcut ? 'pr-12' : 'pr-3.5'
            } ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-stone-200 dark:border-stone-800'
            } ${className}`}
            {...props}
          />
          {hasValue && showClearButton && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-3 grid h-6 w-6 place-items-center rounded-lg text-stone-400 hover:bg-stone-200/80 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400/40 transition-all dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : shortcut ? (
            <div className="pointer-events-none absolute right-3 flex items-center">
              <kbd className="rounded border border-stone-200 bg-white px-1.5 font-mono text-[10px] font-medium text-stone-400 shadow-xs dark:border-stone-800 dark:bg-stone-900 dark:text-stone-500">
                {shortcut}
              </kbd>
            </div>
          ) : null}
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
