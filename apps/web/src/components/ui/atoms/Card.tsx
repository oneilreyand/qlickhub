import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <section
    className={`rounded-2xl border border-stone-200/80 bg-white text-stone-900 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19] dark:text-stone-100 ${className}`}
    {...props}
  >
    {children}
  </section>
);
