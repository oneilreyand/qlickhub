import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export interface SnackbarProps {
  message: string;
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
    <div className="flex max-w-sm w-full items-center gap-3 rounded-2xl bg-[#141413] px-4 py-3 text-xs text-white shadow-2xl ring-1 ring-white/10 dark:bg-[#1C1A19] dark:border dark:border-stone-800 animate-slideUp">
      {typeIcons[type]}
      <span className="flex-1 font-medium leading-relaxed">{message}</span>
      {statusCode && (
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-300 shrink-0">
          {statusCode}
        </span>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
