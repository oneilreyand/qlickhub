import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { useDismissableLayer } from '../../../hooks/useDismissableLayer';
import { normalizeDateStr } from '../../../lib/utils/scheduleHealth';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date range',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalRange, setInternalRange] = useState<DateRange | undefined>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInternalRange(value);
  }, [value]);

  useDismissableLayer(containerRef, isOpen, () => setIsOpen(false));

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getPresetDates = (preset: 'today' | '7days' | '30days' | 'thisMonth') => {
    const today = new Date();

    if (preset === 'today') {
      const t = normalizeDateStr(today);
      return { startDate: t, endDate: t };
    }
    if (preset === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      return { startDate: normalizeDateStr(past), endDate: normalizeDateStr(today) };
    }
    if (preset === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      return { startDate: normalizeDateStr(past), endDate: normalizeDateStr(today) };
    }
    if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: normalizeDateStr(firstDay), endDate: normalizeDateStr(today) };
    }
    return undefined;
  };

  const handleApplyPreset = (preset: 'today' | '7days' | '30days' | 'thisMonth') => {
    const newRange = getPresetDates(preset);
    setInternalRange(newRange);
    if (onChange) onChange(newRange);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (onChange) onChange(internalRange);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInternalRange(undefined);
    if (onChange) onChange(undefined);
    setIsOpen(false);
  };

  const labelText = internalRange?.startDate && internalRange?.endDate
    ? `${formatDateLabel(internalRange.startDate)} – ${formatDateLabel(internalRange.endDate)}`
    : placeholder;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Pick date range"
        className={`inline-flex min-h-[44px] items-center justify-between gap-2.5 rounded-xl border px-3.5 text-xs font-semibold shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#B1E743]/30 ${
          internalRange
            ? 'border-[#B1E743] bg-[#B1E743] text-[#141413] font-bold dark:border-[#B1E743] dark:bg-[#B1E743] dark:text-[#141413]'
            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 opacity-70" />
          <span>{labelText}</span>
        </div>
        {internalRange ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            aria-label="Clear date range"
            className="grid h-4 w-4 place-items-center rounded-full opacity-80 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-400 dark:text-stone-500" />
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl ring-1 ring-stone-900/5 z-40 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Presets</h4>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('today')}
                className="rounded-xl border border-stone-100 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('7days')}
                className="rounded-xl border border-stone-100 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('30days')}
                className="rounded-xl border border-stone-100 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100 transition-colors"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('thisMonth')}
                className="rounded-xl border border-stone-100 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100 transition-colors"
              >
                This Month
              </button>
            </div>

            <div className="border-t border-stone-100 pt-3 dark:border-stone-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 dark:text-stone-400">Custom Range</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-1 dark:text-stone-400">Start Date</label>
                  <input
                    type="date"
                    value={internalRange?.startDate || ''}
                    onChange={(e) =>
                      setInternalRange((prev) => ({
                        startDate: e.target.value,
                        endDate: prev?.endDate || e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2 text-xs text-stone-900 outline-none focus:border-[#B1E743] dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-1 dark:text-stone-400">End Date</label>
                  <input
                    type="date"
                    value={internalRange?.endDate || ''}
                    onChange={(e) =>
                      setInternalRange((prev) => ({
                        startDate: prev?.startDate || e.target.value,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2 text-xs text-stone-900 outline-none focus:border-[#B1E743] dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!internalRange?.startDate || !internalRange?.endDate}
                className="rounded-xl bg-[#B1E743] px-3 py-1.5 text-xs font-bold text-[#141413] shadow-xs hover:bg-[#9ed434] active:bg-[#8cc026] disabled:opacity-40 transition-all dark:bg-[#B1E743] dark:text-[#141413]"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
