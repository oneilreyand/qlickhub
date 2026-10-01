import React, { useState, useRef, useEffect, useId } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { useDismissableLayer } from '../../../hooks/useDismissableLayer';
import { normalizeDateStr } from '../../../lib/utils/scheduleHealth';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
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
  placeholder = 'Pilih rentang tanggal',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalRange, setInternalRange] = useState<DateRange | undefined>(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const startDateInputId = useId();
  const endDateInputId = useId();
  const popoverId = useId();

  useEffect(() => {
    setInternalRange(value);
  }, [value]);

  const closePopover = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useDismissableLayer(containerRef, isOpen, closePopover);

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
    closePopover();
  };

  const handleApplyCustom = () => {
    if (!internalRange?.startDate || !internalRange?.endDate || isRangeInverted) return;
    if (onChange) onChange(internalRange);
    closePopover();
  };

  const handleClear = () => {
    setInternalRange(undefined);
    if (onChange) onChange(undefined);
    closePopover();
  };

  const isRangeInverted = Boolean(
    internalRange?.startDate &&
    internalRange?.endDate &&
    internalRange.startDate > internalRange.endDate,
  );

  const labelText =
    internalRange?.startDate && internalRange?.endDate
      ? `${formatDateLabel(internalRange.startDate)} – ${formatDateLabel(internalRange.endDate)}`
      : placeholder;

  return (
    <div className={`relative inline-block max-w-full text-left ${className}`} ref={containerRef}>
      {/* Trigger controls */}
      <div className="relative inline-flex max-w-full">
        <Button
          ref={triggerRef}
          type="button"
          variant={internalRange ? 'primary' : 'outline'}
          size="sm"
          onClick={() => (isOpen ? closePopover() : setIsOpen(true))}
          aria-expanded={isOpen}
          aria-label="Pilih rentang tanggal"
          aria-haspopup="dialog"
          aria-controls={isOpen ? popoverId : undefined}
          leftIcon={<Calendar className="h-4 w-4" />}
          rightIcon={!internalRange ? <ChevronDown className="h-4 w-4" /> : undefined}
          className={`max-w-full justify-between text-left ${internalRange ? 'pr-12' : ''}`}
        >
          <span className="truncate">{labelText}</span>
        </Button>
        {internalRange && (
          <IconButton
            label="Hapus rentang tanggal"
            onClick={handleClear}
            size="md"
            variant="ghost"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[#141413]/80 hover:bg-[#141413]/10 hover:text-[#141413]"
          >
            <X className="h-4 w-4" />
          </IconButton>
        )}
      </div>

      {/* Popover Card */}
      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Pilih rentang tanggal"
          className="absolute left-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl ring-1 ring-stone-900/5 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        >
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Pilihan Cepat
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleApplyPreset('today')}
                className="w-full px-2 text-[11px]"
              >
                Hari Ini
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleApplyPreset('7days')}
                className="w-full px-2 text-[11px]"
              >
                7 Hari Terakhir
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleApplyPreset('30days')}
                className="w-full px-2 text-[11px]"
              >
                30 Hari Terakhir
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleApplyPreset('thisMonth')}
                className="w-full px-2 text-[11px]"
              >
                Bulan Ini
              </Button>
            </div>

            <div className="border-t border-stone-100 pt-3 dark:border-stone-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 dark:text-stone-400">
                Rentang Khusus
              </h4>
              <div className="space-y-2">
                <div>
                  <label
                    htmlFor={startDateInputId}
                    className="block text-[10px] font-semibold text-stone-500 mb-1 dark:text-stone-400"
                  >
                    Tanggal Mulai
                  </label>
                  <input
                    id={startDateInputId}
                    type="date"
                    value={internalRange?.startDate || ''}
                    onChange={(e) =>
                      setInternalRange((prev) => ({
                        startDate: e.target.value,
                        endDate: prev?.endDate || e.target.value,
                      }))
                    }
                    className="min-h-[44px] w-full rounded-xl border border-stone-200 bg-stone-50 p-2 text-xs text-stone-900 outline-none focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/30 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor={endDateInputId}
                    className="block text-[10px] font-semibold text-stone-500 mb-1 dark:text-stone-400"
                  >
                    Tanggal Akhir
                  </label>
                  <input
                    id={endDateInputId}
                    type="date"
                    value={internalRange?.endDate || ''}
                    onChange={(e) =>
                      setInternalRange((prev) => ({
                        startDate: prev?.startDate || e.target.value,
                        endDate: e.target.value,
                      }))
                    }
                    aria-describedby={isRangeInverted ? `${endDateInputId}-error` : undefined}
                    className="min-h-[44px] w-full rounded-xl border border-stone-200 bg-stone-50 p-2 text-xs text-stone-900 outline-none focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/30 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                  />
                </div>
              </div>
              {isRangeInverted && (
                <p
                  id={`${endDateInputId}-error`}
                  role="alert"
                  className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  Tanggal akhir harus sama atau setelah tanggal mulai.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="px-2 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              >
                Hapus
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApplyCustom}
                disabled={!internalRange?.startDate || !internalRange?.endDate || isRangeInverted}
                className="px-3"
              >
                Terapkan Rentang
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
