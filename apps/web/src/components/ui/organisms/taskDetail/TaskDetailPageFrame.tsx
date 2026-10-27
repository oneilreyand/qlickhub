import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../atoms/Button';

export interface TaskDetailPageFrameProps {
  title: string;
  subtitle?: string;
  /** Mengembalikan false bila perlu menahan navigasi (perubahan belum disimpan). */
  onClose: () => void | boolean;
  backLabel?: string;
  headerActions?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Kerangka halaman untuk detail Feature. Berada di area konten (Sidebar tetap
 * terlihat), berbeda dengan Drawer yang menutup layar.
 */
export const TaskDetailPageFrame: React.FC<TaskDetailPageFrameProps> = ({
  title,
  subtitle,
  onClose,
  backLabel = 'Kembali',
  headerActions,
  toolbar,
  footer,
  children,
}) => (
  <article
    aria-label={`Detail ${title}`}
    className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4"
  >
    <header className="flex flex-wrap items-start gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void onClose()}
        leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
      >
        {backLabel}
      </Button>
      <div className="min-w-0 flex-1 basis-64">
        <h1 className="break-words text-xl font-bold text-stone-900 dark:text-stone-100">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>
        )}
      </div>
      {headerActions && <div className="flex shrink-0 items-center gap-1.5">{headerActions}</div>}
    </header>

    {toolbar && <div className="flex min-w-0 flex-col gap-3">{toolbar}</div>}

    <section
      aria-label={`${title} content`}
      className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 text-sm text-stone-600 dark:border-stone-800 dark:bg-[#1C1A19] dark:text-stone-300 sm:p-6"
    >
      {children}
    </section>

    {footer && (
      <div className="sticky bottom-0 z-10 flex rounded-2xl border border-stone-200/80 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-stone-800 dark:bg-[#1C1A19]/95">
        {footer}
      </div>
    )}
  </article>
);
