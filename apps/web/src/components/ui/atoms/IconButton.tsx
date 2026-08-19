import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  variant?: 'default' | 'ghost' | 'danger';
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  children,
  size = 'md',
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default:
      'border border-stone-200/90 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100',
    ghost:
      'text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200',
    danger:
      'text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300',
  };
  const sizes = { sm: 'h-9 w-9', md: 'h-11 w-11' };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center shrink-0 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="inline-flex items-center justify-center shrink-0 leading-none">{children}</span>
    </button>
  );
};
