import React from 'react';

export interface AlertProps {
  tone?: 'info' | 'warning' | 'error';
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ tone = 'info', icon, title, children }) => {
  const tones = {
    info: 'border-stone-200 bg-stone-100 text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-200',
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  };

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${tones[tone]}`} role="alert">
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div>{title ? <strong className="mb-0.5 block">{title}</strong> : null}{children}</div>
    </div>
  );
};
