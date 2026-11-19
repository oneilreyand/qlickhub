import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Gauge, Plus, X } from 'lucide-react';
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

/**
 * WORK-FOUNDATION P2/P4 (ADR-044): Workspace work calendar — time zone, working days, holidays —
 * and the default weekly capacity in effort points. UX-NAV-CLARITY: laid out as two cards
 * (Kalender kerja; Effort & kapasitas) with one save bar, following the design
 * `05-pengaturan-kalender-kapasitas.webp`.
 */

/** Fixed effort scale (WORK-FOUNDATION); the same in every Workspace so loads can be summed. */
const EFFORT_SCALE = [
  { size: 'XS', points: 1 },
  { size: 'S', points: 2 },
  { size: 'M', points: 3 },
  { size: 'L', points: 5 },
  { size: 'XL', points: 8 },
] as const;

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
  /** Link to the page where per-person capacity and time off are set (Tim & Akses). */
  peopleLink?: React.ReactNode;
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
  peopleLink,
}) => {
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [capacity, setCapacity] = useState('15');
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  useEffect(() => {
    if (calendar) {
      setTimezone(calendar.timezone);
      setWorkingDays(calendar.workingDays);
      setCapacity(String(calendar.defaultWeeklyCapacityPoints));
    }
  }, [calendar]);

  const timezoneOptions = useMemo(() => {
    if (!calendar || TIMEZONE_OPTIONS.some((option) => option.value === calendar.timezone)) {
      return TIMEZONE_OPTIONS;
    }
    return [...TIMEZONE_OPTIONS, { value: calendar.timezone, label: calendar.timezone }];
  }, [calendar]);

  const capacityValue = Number(capacity);
  const capacityError =
    capacity.trim() === '' ||
    !Number.isInteger(capacityValue) ||
    capacityValue < 1 ||
    capacityValue > 200
      ? 'Isi bilangan bulat 1–200.'
      : null;
  const isDirty =
    calendar !== null &&
    (timezone !== calendar.timezone ||
      workingDays.join(',') !== calendar.workingDays.join(',') ||
      capacityValue !== calendar.defaultWeeklyCapacityPoints);
  const disabled = !canManage || isSaving;

  const toggleDay = (day: number) => {
    setWorkingDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const resetForm = () => {
    if (!calendar) return;
    setTimezone(calendar.timezone);
    setWorkingDays(calendar.workingDays);
    setCapacity(String(calendar.defaultWeeklyCapacityPoints));
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

  const header = (icon: React.ReactNode, id: string, title: string, help: string) => (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <h2 id={id} className="text-base font-bold text-stone-900 dark:text-stone-100">
          {title}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{help}</p>
      </div>
    </div>
  );
  const iconClass = 'mt-1 h-4 w-4 shrink-0 text-stone-700 dark:text-[#B1E743]';

  if (isLoading || error || !calendar) {
    return (
      <Card id="work-calendar" className="space-y-4 p-6" aria-busy={isLoading}>
        {header(
          <CalendarDays className={iconClass} />,
          'work-calendar-h',
          'Kalender kerja',
          'Dipakai untuk menghitung telat, berisiko, dan hari kerja yang tersedia.',
        )}
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
      </Card>
    );
  }

  return (
    <div id="work-calendar" className="space-y-5">
      {!canManage && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Hanya Owner atau Admin yang dapat mengubah kalender kerja dan kapasitas default.
        </p>
      )}

      <Card className="space-y-5 p-6" aria-labelledby="work-calendar-h">
        {header(
          <CalendarDays className={iconClass} />,
          'work-calendar-h',
          'Kalender kerja',
          'Dipakai untuk menghitung telat, berisiko, dan hari kerja yang tersedia.',
        )}
        <div className="max-w-sm">
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
        </div>

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
                  className={`min-h-[44px] min-w-[52px] rounded-xl border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300">Hari libur</h3>
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
                <li key={holiday.id} className="flex items-center justify-between gap-2 px-3 py-1">
                  <span className="min-w-0 text-sm text-stone-700 dark:text-stone-300">
                    <strong className="font-semibold text-stone-900 dark:text-stone-100">
                      {formatHolidayDate(holiday.date)}
                    </strong>{' '}
                    <span className="text-stone-500 dark:text-stone-400">· {holiday.name}</span>
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      aria-label={`Hapus hari libur ${holiday.name}`}
                      disabled={isSaving}
                      onClick={() => onRemoveHoliday(holiday.id)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="space-y-5 p-6" aria-labelledby="effort-capacity-h">
        {header(
          <Gauge className={iconClass} />,
          'effort-capacity-h',
          'Effort & kapasitas',
          'Setiap subtask diberi ukuran effort. Beban = poin effort dibanding kapasitas orang.',
        )}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Skala effort
          </span>
          <ul className="flex flex-wrap gap-2" aria-label="Skala effort">
            {EFFORT_SCALE.map(({ size, points }) => (
              <li
                key={size}
                className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl bg-stone-100 px-3 py-2.5 dark:bg-stone-800"
              >
                <span className="text-base font-extrabold text-stone-900 dark:text-white">
                  {size}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">{points} poin</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Skala sama di semua workspace supaya beban lintas workspace bisa dijumlahkan.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="w-full sm:w-56">
            <Input
              id="default-weekly-capacity"
              label="Kapasitas default (poin per minggu)"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={capacity}
              disabled={disabled}
              error={canManage ? (capacityError ?? undefined) : undefined}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </div>
          <p className="flex-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Dipakai untuk anggota yang belum mengatur kapasitas sendiri; anggota di beberapa
            workspace memakai default terkecil. Kapasitas dan cuti per orang diatur di{' '}
            {peopleLink ?? 'Tim & Akses'}, karena satu orang bisa bekerja di beberapa workspace.
          </p>
        </div>
      </Card>

      {canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={!isDirty || isSaving} onClick={resetForm}>
            Batal
          </Button>
          <Button
            disabled={!isDirty || workingDays.length === 0 || Boolean(capacityError)}
            isLoading={isSaving}
            onClick={() =>
              onSave({ timezone, workingDays, defaultWeeklyCapacityPoints: capacityValue })
            }
          >
            Simpan perubahan
          </Button>
        </div>
      )}
    </div>
  );
};
