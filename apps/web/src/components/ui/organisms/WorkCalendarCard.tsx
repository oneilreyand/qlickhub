import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, X } from 'lucide-react';
import type {
  CreateWorkspaceHolidayInput,
  UpdateWorkCalendarInput,
  WorkCalendar,
} from '@qlick/contracts';
import { Alert } from '../atoms/Alert';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { Select } from '../atoms/Select';

/** WORK-FOUNDATION P2 (ADR-044): Workspace work calendar — time zone, working days, holidays. */

const WEEKDAYS = [
  { day: 1, short: 'Sen', long: 'Senin' },
  { day: 2, short: 'Sel', long: 'Selasa' },
  { day: 3, short: 'Rab', long: 'Rabu' },
  { day: 4, short: 'Kam', long: 'Kamis' },
  { day: 5, short: 'Jum', long: 'Jumat' },
  { day: 6, short: 'Sab', long: 'Sabtu' },
  { day: 7, short: 'Min', long: 'Minggu' },
] as const;

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB, UTC+7)' },
  { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA, UTC+8)' },
  { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT, UTC+9)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
  { value: 'UTC', label: 'UTC' },
];

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatHolidayDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export interface WorkCalendarCardProps {
  calendar: WorkCalendar | null;
  isLoading: boolean;
  error: string | null;
  canManage: boolean;
  isSaving: boolean;
  onRetry: () => void;
  onSave: (input: UpdateWorkCalendarInput) => void;
  onAddHoliday: (input: CreateWorkspaceHolidayInput) => Promise<boolean> | void;
  onRemoveHoliday: (holidayId: string) => void;
}

export const WorkCalendarCard: React.FC<WorkCalendarCardProps> = ({
  calendar,
  isLoading,
  error,
  canManage,
  isSaving,
  onRetry,
  onSave,
  onAddHoliday,
  onRemoveHoliday,
}) => {
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  useEffect(() => {
    if (calendar) {
      setTimezone(calendar.timezone);
      setWorkingDays(calendar.workingDays);
    }
  }, [calendar]);

  const timezoneOptions = useMemo(() => {
    if (!calendar || TIMEZONE_OPTIONS.some((option) => option.value === calendar.timezone)) {
      return TIMEZONE_OPTIONS;
    }
    return [...TIMEZONE_OPTIONS, { value: calendar.timezone, label: calendar.timezone }];
  }, [calendar]);

  const isDirty =
    calendar !== null &&
    (timezone !== calendar.timezone || workingDays.join(',') !== calendar.workingDays.join(','));
  const disabled = !canManage || isSaving;

  const toggleDay = (day: number) => {
    setWorkingDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const submitHoliday = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!holidayDate || !holidayName.trim()) return;
    const saved = await onAddHoliday({ date: holidayDate, name: holidayName.trim() });
    if (saved !== false) {
      setHolidayDate('');
      setHolidayName('');
      setShowHolidayForm(false);
    }
  };

  return (
    <Card id="work-calendar" className="space-y-4 p-5" aria-busy={isLoading}>
      <div className="flex items-start gap-2 border-b border-stone-100 pb-3 dark:border-stone-800">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-stone-700 dark:text-[#B1E743]" />
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Kalender kerja</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            Dipakai untuk menghitung telat, berisiko, dan hari kerja yang tersedia.
          </p>
        </div>
      </div>

      {isLoading && (
        <div
          role="status"
          className="flex min-h-[96px] items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400"
        >
          <LoadingSpinner size="sm" />
          Memuat kalender kerja…
        </div>
      )}

      {!isLoading && error && (
        <div className="space-y-2">
          <Alert tone="error" title="Kalender kerja gagal dimuat">
            {error}
          </Alert>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      )}

      {!isLoading && !error && calendar && (
        <>
          {!canManage && (
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Hanya Owner atau Admin yang dapat mengubah kalender kerja.
            </p>
          )}
          <Select
            label="Zona waktu"
            value={timezone}
            disabled={disabled}
            onChange={(event) => setTimezone(event.target.value)}
          >
            {timezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
              Hari kerja
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map(({ day, short, long }) => {
                const active = workingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    aria-label={long}
                    disabled={disabled}
                    onClick={() => toggleDay(day)}
                    className={`min-h-[40px] min-w-[44px] rounded-xl border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? 'border-[#141413] bg-[#141413] text-white dark:border-stone-200 dark:bg-stone-200 dark:text-[#141413]'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-transparent dark:text-stone-300 dark:hover:bg-stone-800'
                    }`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
            {workingDays.length === 0 && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                Pilih minimal satu hari kerja.
              </p>
            )}
          </fieldset>

          {canManage && (
            <Button
              size="sm"
              disabled={!isDirty || workingDays.length === 0}
              isLoading={isSaving}
              onClick={() => onSave({ timezone, workingDays })}
            >
              Simpan kalender
            </Button>
          )}

          <div className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Hari libur
              </h3>
              {canManage && !showHolidayForm && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setShowHolidayForm(true)}
                >
                  Tambah
                </Button>
              )}
            </div>

            {showHolidayForm && (
              <form
                onSubmit={(event) => void submitHoliday(event)}
                className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
              >
                <Input
                  label="Tanggal"
                  type="date"
                  value={holidayDate}
                  onChange={(event) => setHolidayDate(event.target.value)}
                  required
                />
                <Input
                  label="Nama hari libur"
                  value={holidayName}
                  maxLength={120}
                  onChange={(event) => setHolidayName(event.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!holidayDate || !holidayName.trim()}
                    isLoading={isSaving}
                  >
                    Simpan hari libur
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHolidayForm(false)}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}

            {calendar.holidays.length === 0 ? (
              <p className="rounded-xl bg-stone-50 px-3 py-4 text-center text-[11px] text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
                Belum ada hari libur. Akhir pekan di luar hari kerja sudah tidak dihitung.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                {calendar.holidays.map((holiday) => (
                  <li
                    key={holiday.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <span className="min-w-0 text-xs text-stone-700 dark:text-stone-300">
                      <strong className="font-semibold text-stone-900 dark:text-stone-100">
                        {formatHolidayDate(holiday.date)}
                      </strong>{' '}
                      · {holiday.name}
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        aria-label={`Hapus hari libur ${holiday.name}`}
                        disabled={isSaving}
                        onClick={() => onRemoveHoliday(holiday.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Card>
  );
};
