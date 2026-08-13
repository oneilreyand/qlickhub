import React, { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { OverviewBannerCarousel } from './OverviewBannerCarousel';

export const OverviewStoreDashboard: React.FC = () => {
  const [selectedTimeframe] = useState('This month');

  // Sample Sales Analytics Bar Heights matching screenshot
  const salesBarData = [
    { sold: 65, returnVal: 20 },
    { sold: 40, returnVal: 15 },
    { sold: 85, returnVal: 10 },
    { sold: 50, returnVal: 30 },
    { sold: 70, returnVal: 10 },
    { sold: 90, returnVal: 5 },
    { sold: 35, returnVal: 25 },
    { sold: 60, returnVal: 15 },
    { sold: 75, returnVal: 10 },
    { sold: 55, returnVal: 20 },
    { sold: 80, returnVal: 15 },
    { sold: 45, returnVal: 10 },
    { sold: 104, returnVal: 0, isHovered: true }, // Tooltip bar (August 14)
    { sold: 65, returnVal: 20 },
    { sold: 40, returnVal: 15 },
    { sold: 95, returnVal: 10 },
    { sold: 70, returnVal: 15 },
    { sold: 50, returnVal: 25 },
    { sold: 85, returnVal: 10 },
    { sold: 60, returnVal: 15 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Top Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#22201F] tracking-tight dark:text-white">
            Overview
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-1 dark:text-stone-400">
            Detailed information about your task
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selector Pill */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-stone-200/90 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-xs hover:bg-stone-50 transition-all dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              <span>{selectedTimeframe}</span>
              <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
            </button>
          </div>

          {/* Export Action Button Pill */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-[#22201F] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-stone-800 transition-all dark:bg-[#B1E743] dark:text-[#22201F]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <OverviewBannerCarousel />

      {/* Main Grid: Left Column Summary Cards (35%), Right Column Sales Analytics (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 Cols on lg) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Total Revenue */}
          <div className="rounded-[24px] bg-white p-6 border border-stone-200/60 shadow-xs space-y-4 dark:bg-[#1C1A19] dark:border-stone-800">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Total Revenue
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
                $ 15,650
              </span>
              <span className="inline-flex items-center rounded-full bg-[#22201F] px-2.5 py-0.5 text-[10px] font-bold text-[#B1E743] dark:bg-[#B1E743] dark:text-[#22201F]">
                +30.4%
              </span>
            </div>
            <div className="flex items-end justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
              <p className="text-[11px] font-medium text-stone-400">
                $12,000 last month
              </p>
              {/* Mini Sparkline Bar Chart */}
              <div className="flex items-end gap-1.5 h-10">
                {[
                  { m: 'Mar', h: '40%' },
                  { m: 'Apr', h: '60%' },
                  { m: 'May', h: '100%' },
                  { m: 'Jun', h: '75%' },
                  { m: 'Jul', h: '90%' },
                ].map((bar, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-2.5 rounded-full bg-[#B1E743]"
                      style={{ height: bar.h }}
                    />
                    <span className="text-[8px] font-semibold text-stone-400">
                      {bar.m}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Total Customers */}
          <div className="rounded-[24px] bg-white p-6 border border-stone-200/60 shadow-xs space-y-4 dark:bg-[#1C1A19] dark:border-stone-800">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Total Customers
            </p>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
                    1,226
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[#22201F] px-2.5 py-0.5 text-[10px] font-bold text-[#B1E743] dark:bg-[#B1E743] dark:text-[#22201F]">
                    +79.6%
                  </span>
                </div>
                <p className="text-[11px] font-medium text-stone-400 mt-2">
                  683 users last month
                </p>
              </div>

              {/* Donut Chart Ring */}
              <div className="relative grid place-items-center h-20 w-20">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-stone-100 dark:text-stone-800"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#B1E743]"
                    strokeDasharray="63, 100"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-xs font-bold text-[#22201F] dark:text-white">
                  63%
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-start gap-4 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] font-semibold text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#B1E743]" /> Women
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-700" /> Men
              </span>
            </div>
          </div>

          {/* Card 3: Total Orders */}
          <div className="rounded-[24px] bg-white p-6 border border-stone-200/60 shadow-xs space-y-3 dark:bg-[#1C1A19] dark:border-stone-800">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Total Orders
            </p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-extrabold text-[#22201F] dark:text-white">
                15,240
              </span>
              <div className="h-8 w-28">
                {/* Wave sparkline */}
                <svg className="h-full w-full overflow-visible" viewBox="0 0 100 30">
                  <path
                    d="M0 20 Q 25 5, 50 18 T 100 10"
                    fill="none"
                    stroke="#B1E743"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sales Analytics Chart (8 Cols on lg) */}
        <div className="lg:col-span-8 rounded-[24px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-xs space-y-6 dark:bg-[#1C1A19] dark:border-stone-800">
          {/* Header & Legend */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#22201F] dark:text-white">
              Sales Analytics
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B1E743]" /> Products sold
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-stone-200 dark:bg-stone-700" /> Product returns
              </span>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="relative pt-8 pb-4">
            {/* Y-Axis Scale Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-semibold text-stone-400">
              {[105, 90, 80, 65, 55, 45, 10].map((val) => (
                <div key={val} className="flex items-center gap-3">
                  <span className="w-6 text-right">{val}</span>
                  <div className="flex-1 border-b border-stone-100 dark:border-stone-800/60" />
                </div>
              ))}
            </div>

            {/* Stacked Vertical Bars */}
            <div className="relative z-10 ml-9 flex items-end justify-between h-72 pt-4 px-2">
              {salesBarData.map((bar, idx) => (
                <div
                  key={idx}
                  className="relative group flex flex-col items-center h-full justify-end cursor-pointer"
                >
                  {/* Floating Tooltip Pill (Active on August 14) */}
                  {bar.isHovered && (
                    <div className="absolute -top-12 z-20 flex flex-col items-start rounded-xl bg-[#22201F] px-3 py-2 text-[10px] font-semibold text-white shadow-xl min-w-[90px] border border-stone-700">
                      <span className="text-stone-400 text-[9px]">August, 14</span>
                      <span className="flex items-center gap-1.5 text-[#B1E743] mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#B1E743]" /> Sold {bar.sold}
                      </span>
                      <span className="flex items-center gap-1.5 text-stone-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400" /> Return {bar.returnVal}
                      </span>
                    </div>
                  )}

                  {/* Dual Bar (Top Return Light Gray + Bottom Sold Lime) */}
                  <div className="w-3 sm:w-3.5 flex flex-col rounded-full overflow-hidden transition-all duration-200 group-hover:opacity-80">
                    <div
                      className="bg-stone-200 dark:bg-stone-700 w-full"
                      style={{ height: `${bar.returnVal * 1.8}px` }}
                    />
                    <div
                      className="bg-[#B1E743] w-full"
                      style={{ height: `${bar.sold * 1.8}px` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
