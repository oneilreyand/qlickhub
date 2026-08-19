import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../atoms/Button';

interface TaskHubErrorBannerProps {
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const TaskHubErrorBanner: React.FC<TaskHubErrorBannerProps> = ({
  error,
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 dark:border-rose-900/60 dark:bg-rose-950/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Gagal Memuat Daftar Tugas
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              {error}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          isLoading={isRetrying}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          className="border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/40 shrink-0"
        >
          Coba Lagi
        </Button>
      </div>
    </div>
  );
};
