import React from 'react';
import { Button } from '../atoms/Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  illustrationSrc?: string;
  illustrationAlt?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  illustrationSrc,
  illustrationAlt = '',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center sm:p-12 dark:border-stone-800 dark:bg-stone-900/40">
      {illustrationSrc ? (
        <img
          src={illustrationSrc}
          alt={illustrationAlt}
          className="h-32 w-auto max-w-full object-contain sm:h-40"
        />
      ) : (
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-white text-[#141413] shadow-sm dark:border-stone-800 dark:bg-stone-800 dark:text-[#B1E743]">
          {icon}
        </div>
      )}
      <h3 className="mt-4 text-base font-bold text-stone-900 dark:text-stone-100">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
