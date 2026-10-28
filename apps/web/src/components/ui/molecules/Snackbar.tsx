import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export interface SnackbarProps {
  message: React.ReactNode;
  type?: 'success' | 'warning' | 'error' | 'info';
  statusCode?: number;
  onClose: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  message,
  type = 'info',
  statusCode,
  onClose,
}) => {
  const typeIcons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />,
    error: <XCircle className="h-4 w-4 text-rose-400 shrink-0" />,
    info: <Bell className="h-4 w-4 text-[#B1E743] shrink-0" />,
  };

  return (
    <div className="flex max-w-sm w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-700 shadow-xl ring-1 ring-stone-900/5 dark:border-stone-800 dark:bg-[#1C1A19] dark:text-white dark:shadow-2xl dark:ring-white/10 animate-slideUp">
      {typeIcons[type]}
      <span className="min-w-0 flex-1 break-words font-medium leading-relaxed">{message}</span>
      {statusCode && (
        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-600 shrink-0 dark:bg-white/10 dark:text-stone-300">
          {statusCode}
        </span>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-900 shrink-0 dark:hover:bg-stone-800 dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
