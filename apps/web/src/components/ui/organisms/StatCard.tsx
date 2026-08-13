import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
}) => {
  return (
    <div className="rounded-[24px] border border-stone-200/80 bg-white p-6 shadow-xs transition-shadow hover:shadow-md dark:border-stone-800/80 dark:bg-[#1C1A19] dark:text-stone-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">{title}</span>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-stone-100 text-[#22201F] dark:bg-stone-800 dark:text-[#B1E743]">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-3xl font-extrabold text-[#22201F] dark:text-white">{value}</p>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-bold ${
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            <span>{trend.value}</span>
          </span>
        )}
      </div>
      {description && <p className="mt-1 text-xs font-medium text-stone-400">{description}</p>}
    </div>
  );
};
