import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center sm:p-12 dark:border-stone-800 dark:bg-stone-900/40">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#22201F] shadow-sm border border-stone-200 dark:border-stone-800 dark:bg-stone-800 dark:text-[#B1E743]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-stone-900 dark:text-stone-100">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#22201F] px-4 text-xs font-semibold text-white shadow-md hover:bg-stone-800 dark:bg-[#B1E743] dark:text-[#22201F]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
