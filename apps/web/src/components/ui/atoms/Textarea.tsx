import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={textareaId} className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
            {label}
          </label>
        ) : null}
        <textarea
          id={textareaId}
          ref={ref}
          className={`w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-900 outline-none transition focus:border-[#22201F] focus:bg-white focus:ring-2 focus:ring-[#22201F]/10 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-[#B1E743] dark:focus:ring-[#B1E743]/20 ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${className}`}
          {...props}
        />
        {error ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
