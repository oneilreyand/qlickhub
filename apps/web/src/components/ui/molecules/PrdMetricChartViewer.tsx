import React, { useState } from 'react';
import { BarChart3, PieChart, ZoomIn, AlertCircle, Code, Eye } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '../atoms/Button';

export interface BarChartItem {
  label: string;
  value: number;
  target?: number;
  color?: string;
}

export interface MetricChartConfig {
  type: 'bar' | 'donut' | 'progress';
  title?: string;
  unit?: string;
  data?: BarChartItem[];
  value?: number;
  max?: number;
  subtitle?: string;
}

export interface PrdMetricChartViewerProps {
  code: string;
  className?: string;
}

export const PrdMetricChartViewer: React.FC<PrdMetricChartViewerProps> = ({
  code,
  className = '',
}) => {
  const [showRawCode, setShowRawCode] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  let config: MetricChartConfig | null = null;
  let parseError: string | null = null;

  try {
    const parsed = JSON.parse(code.trim());
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Konfigurasi chart harus berupa objek JSON yang valid.');
    }
    config = parsed as MetricChartConfig;
  } catch (err: any) {
    parseError = err?.message || 'Gagal mengurai format JSON grafik';
  }

  const renderContent = () => {
    if (parseError || !config) {
      return (
        <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Format Grafik Tidak Valid
              </p>
              <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-400">{parseError}</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Sintaks Asli:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-stone-900 p-2.5 font-mono text-xs text-stone-200">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      );
    }

    if (config.type === 'donut' || config.type === 'progress') {
      const val = typeof config.value === 'number' ? config.value : 0;
      const max = typeof config.max === 'number' && config.max > 0 ? config.max : 100;
      const pct = Math.min(100, Math.max(0, Math.round((val / max) * 100)));
      const unit = config.unit || '%';

      // SVG circle math: r = 40, circumference = 2 * PI * 40 = 251.32
      const radius = 40;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (pct / 100) * circumference;

      return (
        <div
          data-testid="donut-chart-view"
          className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4"
        >
          {/* Circular Donut Ring */}
          <div className="relative h-28 w-28 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-stone-100 dark:stroke-stone-800"
                strokeWidth="10"
                fill="none"
              />
              {/* Progress fill circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-[#3F6212] dark:stroke-[#B1E743] transition-all duration-700 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
                {val}
                <span className="text-xs font-medium text-stone-500">{unit}</span>
              </span>
              <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                {pct}% Target
              </span>
            </div>
          </div>

          {/* Meta Information */}
          <div className="space-y-1.5 text-center sm:text-left">
            <h5 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {config.title || 'Indikator Target KPI'}
            </h5>
            {config.subtitle && (
              <p className="text-xs text-stone-500 dark:text-stone-400">{config.subtitle}</p>
            )}
            <div className="flex items-center justify-center sm:justify-start gap-4 pt-1 text-xs">
              <div>
                <span className="block text-[10px] text-stone-400 uppercase">Realisasi</span>
                <strong className="text-stone-800 dark:text-stone-200">
                  {val} {unit}
                </strong>
              </div>
              <div className="h-4 w-px bg-stone-200 dark:bg-stone-800" />
              <div>
                <span className="block text-[10px] text-stone-400 uppercase">Batas Maksimum</span>
                <strong className="text-stone-800 dark:text-stone-200">
                  {max} {unit}
                </strong>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default: Bar Chart (type === 'bar')
    const items = config.data || [];
    const maxVal = Math.max(...items.map((i) => Math.max(i.value, i.target || 0)), 1);
    const unit = config.unit ? ` (${config.unit})` : '';

    return (
      <div data-testid="bar-chart-view" className="space-y-4 py-2">
        {items.length === 0 ? (
          <p className="text-center text-xs text-stone-500 py-4">Tidak ada data batang grafik.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const pct = Math.min(100, Math.round((item.value / maxVal) * 100));
              const targetPct = item.target
                ? Math.min(100, Math.round((item.target / maxVal) * 100))
                : null;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                    <span>{item.label}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-stone-900 dark:text-stone-100 font-bold">
                        {item.value}
                        {unit}
                      </span>
                      {item.target !== undefined && (
                        <span className="text-stone-400 text-[10px]">
                          (Target: {item.target}
                          {unit})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bar track container */}
                  <div className="relative h-6 w-full rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    {/* Target dashed line indicator */}
                    {targetPct !== null && (
                      <div
                        className="absolute top-0 bottom-0 z-10 w-0.5 border-r-2 border-dashed border-rose-500"
                        style={{ left: `${targetPct}%` }}
                        title={`Target: ${item.target}${unit}`}
                      />
                    )}

                    {/* Active Bar */}
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-[#166534] to-[#3F6212] dark:from-[#3F6212] dark:to-[#B1E743] transition-all duration-500"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 pt-1 text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#166534] dark:bg-[#B1E743]" />
            <span>Aktual / Estimasi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 border-b-2 border-dashed border-rose-500" />
            <span>Garis Target</span>
          </div>
        </div>
      </div>
    );
  };

  const chartTitle = config?.title || 'Grafik Metrik Target PRD';

  return (
    <div
      data-testid="prd-metric-chart"
      className={`my-3 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900/60 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/70 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2">
          {config?.type === 'donut' || config?.type === 'progress' ? (
            <PieChart className="h-4 w-4 text-[#166534] dark:text-[#B1E743]" />
          ) : (
            <BarChart3 className="h-4 w-4 text-[#166534] dark:text-[#B1E743]" />
          )}
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">{chartTitle}</h4>
          <span className="rounded-md bg-stone-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            {config?.type === 'donut' ? 'Donut KPI' : 'Bar Chart'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRawCode((prev) => !prev)}
            title={showRawCode ? 'Tampilkan grafik visual' : 'Lihat konfigurasi data JSON'}
            className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            {showRawCode ? (
              <>
                <Eye className="mr-1 h-3.5 w-3.5" />
                <span>Visual</span>
              </>
            ) : (
              <>
                <Code className="mr-1 h-3.5 w-3.5" />
                <span>JSON</span>
              </>
            )}
          </Button>

          {!parseError && !showRawCode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLightboxOpen(true)}
              title="Perbesar tampilan grafik"
              className="h-7 px-2 text-xs"
              data-testid="chart-zoom-button"
            >
              <ZoomIn className="mr-1 h-3.5 w-3.5" />
              <span>Perbesar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4">
        {showRawCode ? (
          <pre className="overflow-x-auto rounded-xl bg-stone-950 p-3 font-mono text-xs text-stone-100 border border-stone-800">
            <code>{code}</code>
          </pre>
        ) : (
          renderContent()
        )}
      </div>

      {/* Lightbox Modal */}
      <Modal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={chartTitle}
        size="md"
      >
        <div className="p-4 bg-white dark:bg-stone-900 rounded-xl">{renderContent()}</div>
      </Modal>
    </div>
  );
};
