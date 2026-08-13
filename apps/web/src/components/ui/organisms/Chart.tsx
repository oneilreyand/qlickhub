import React, { useState } from 'react';

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface BarChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  subtitle,
  primaryLabel = 'Passed Tests',
  secondaryLabel = 'Failed Tests',
  height = 200,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(
    ...data.map((d) => (d.value || 0) + (d.secondaryValue || 0)),
    10
  );

  return (
    <div className="w-full rounded-[24px] border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19] dark:text-stone-100">
      {(title || subtitle) && (
        <div className="mb-6 flex flex-col gap-1 border-b border-stone-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
          <div>
            {title && <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</h3>}
            {subtitle && <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-medium text-stone-600 dark:text-stone-300">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#B1E743]" />
              <span>{primaryLabel}</span>
            </div>
            {secondaryLabel && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                <span>{secondaryLabel}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart Bars */}
      <div className="relative flex items-end justify-between gap-2 pt-6 px-2" style={{ height: `${height}px` }}>
        {/* Background Grid Lines */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between border-b border-stone-100 dark:border-stone-800">
          <div className="w-full border-b border-stone-100 border-dashed dark:border-stone-800" />
          <div className="w-full border-b border-stone-100 border-dashed dark:border-stone-800" />
          <div className="w-full border-b border-stone-100 border-dashed dark:border-stone-800" />
        </div>

        {data.map((item, idx) => {
          const primaryHeightPercent = (item.value / maxValue) * 100;
          const secondaryHeightPercent = ((item.secondaryValue || 0) / maxValue) * 100;

          return (
            <div
              key={`${item.label}-${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group relative flex flex-1 flex-col items-center justify-end h-full z-10 cursor-pointer"
            >
              {/* Tooltip */}
              {hoveredIdx === idx && (
                <div className="absolute -top-12 z-30 rounded-xl bg-[#22201F] px-3 py-1.5 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap animate-fade-in dark:bg-stone-800 dark:border dark:border-stone-700">
                  <span>{item.label}: </span>
                  <span className="text-[#B1E743]">{item.value} passed</span>
                  {item.secondaryValue !== undefined && (
                    <span className="text-rose-400">, {item.secondaryValue} failed</span>
                  )}
                </div>
              )}

              {/* Bar Stack */}
              <div className="flex w-full max-w-[36px] flex-col-reverse items-center overflow-hidden rounded-t-xl transition-transform group-hover:scale-105">
                <div
                  className="w-full bg-[#B1E743] transition-all duration-500"
                  style={{ height: `${primaryHeightPercent}%` }}
                />
                {item.secondaryValue !== undefined && (
                  <div
                    className="w-full bg-rose-500 transition-all duration-500"
                    style={{ height: `${secondaryHeightPercent}%` }}
                  />
                )}
              </div>

              {/* Axis Label */}
              <span className="mt-2 truncate text-[11px] font-semibold text-stone-500 group-hover:text-[#22201F] dark:text-stone-400 dark:group-hover:text-[#B1E743]">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface LineChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  label?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  subtitle,
  label = 'QA Coverage %',
  height = 180,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 100);
  const padding = 30;
  const chartWidth = 500;
  const chartHeight = height;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - (d.value / maxValue) * (chartHeight - padding * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

  return (
    <div className="w-full rounded-[24px] border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800/80 dark:bg-[#1C1A19] dark:text-stone-100">
      {(title || subtitle) && (
        <div className="mb-4 flex flex-col gap-1 border-b border-stone-100 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
          <div>
            {title && <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</h3>}
            {subtitle && <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#22201F] dark:text-[#B1E743]">
            <span className="h-2 w-2 rounded-full bg-[#22201F] dark:bg-[#B1E743]" />
            <span>{label}</span>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#78716c" strokeDasharray="4 4" className="opacity-30" />
          <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#78716c" strokeDasharray="4 4" className="opacity-30" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#a8a29e" />

          {/* Smooth Line Path */}
          <path d={pathD} fill="none" stroke="#B1E743" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Circles */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="5" className="fill-[#22201F] stroke-white stroke-2 transition-transform group-hover:r-7 dark:fill-[#B1E743] dark:stroke-[#1C1A19]" />
              <text x={p.x} y={chartHeight - 10} textAnchor="middle" className="text-[10px] font-semibold fill-stone-500 dark:fill-stone-400">
                {p.data.label}
              </text>
              <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-bold fill-[#22201F] opacity-0 group-hover:opacity-100 transition-opacity dark:fill-[#B1E743]">
                {p.data.value}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
