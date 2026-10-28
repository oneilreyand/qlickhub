import React from 'react';
import { ChevronLeft } from 'lucide-react';

export interface TaskDetailPageFrameProps {
  title: string;
  /** Label kecil di atas judul, mis. FEATURE atau SUBTASK. */
  eyebrow?: string;
  /** Satu baris di bawah judul, mis. "PIC Reyand · Oktober · 30 Sep – 5 Okt". */
  meta?: string;
  /** Jalur folder setelah tombol kembali, mis. ["2026", "Oktober"]. */
  breadcrumb?: string[];
  /** Mengembalikan false bila perlu menahan navigasi (perubahan belum disimpan). */
  onClose: () => void | boolean;
  backLabel?: string;
  /** Aksi di kanan bar atas (Aktivitas, menu lainnya). */
  headerActions?: React.ReactNode;
  /** Stepper tahap. */
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
  eyebrow,
  meta,
  breadcrumb = [],
  onClose,
  backLabel = 'Kembali',
  headerActions,
  toolbar,
  footer,
  children,
}) => (
  <article
    aria-label={`Detail ${title}`}
    className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5"
  >
    <div className="flex flex-wrap items-center gap-3">
      <nav aria-label="Lokasi" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={() => void onClose()}
          className="inline-flex items-center gap-1 rounded-lg py-1 pr-2 font-medium text-stone-700 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7CB518] dark:text-stone-300 dark:hover:text-white"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          {backLabel}
        </button>
        {breadcrumb.length > 0 && (
          <>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-600">
              /
            </span>
            <span className="truncate text-stone-500 dark:text-stone-400">
              {breadcrumb.join(' / ')}
            </span>
          </>
        )}
      </nav>
      {headerActions && <div className="flex shrink-0 items-center gap-2">{headerActions}</div>}
    </div>

    <header className="min-w-0">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-0.5 break-words text-2xl font-bold tracking-tight sm:text-[28px] sm:leading-9 text-stone-900 dark:text-stone-100">
        {title}
      </h1>
      {meta && <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">{meta}</p>}
    </header>

    {toolbar}

    <section aria-label={`${title} content`} className="min-w-0">
      {children}
    </section>

    {footer && (
      <div className="sticky bottom-0 z-10 flex rounded-2xl border border-stone-200/80 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-stone-800 dark:bg-[#1C1A19]/95">
        {footer}
      </div>
    )}
  </article>
);
