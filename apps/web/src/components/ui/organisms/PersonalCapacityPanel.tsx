import React, { useEffect, useState } from 'react';
import { Gauge, Plus, X } from 'lucide-react';
import type { CreateUserTimeOffInput, UserCapacity } from '@qlick/contracts';
import { Alert } from '../atoms/Alert';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { LoadingSpinner } from '../atoms/LoadingSpinner';

/**
 * WORK-FOUNDATION P4 (ADR-044): a person's own weekly capacity (effort points) and time off.
 * One capacity applies across every Workspace. Time off is a date range only, no reason.
 */

const SOURCE_LABEL: Record<UserCapacity['source'], string> = {
  override: 'diatur sendiri',
  workspace_default: 'mengikuti default Workspace (terkecil)',
  system_default: 'mengikuti default sistem',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const formatDate = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00Z`));

function rangeLabel(startDate: string, endDate: string) {
  return startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

export interface PersonalCapacityPanelProps {
  capacity: UserCapacity | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  onRetry: () => void;
  /** null clears the override and follows the Workspace default. */
  onSaveCapacity: (weeklyPoints: number | null) => void;
  onAddTimeOff: (input: CreateUserTimeOffInput) => Promise<boolean> | void;
  onRemoveTimeOff: (timeOffId: string) => void;
}

export const PersonalCapacityPanel: React.FC<PersonalCapacityPanelProps> = ({
  capacity,
  isLoading,
  error,
  isSaving,
  onRetry,
  onSaveCapacity,
  onAddTimeOff,
  onRemoveTimeOff,
}) => {
  const [points, setPoints] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (capacity) setPoints(String(capacity.weeklyPoints ?? capacity.effectiveWeeklyPoints));
  }, [capacity]);

  const value = Number(points);
  const pointsError =
    points.trim() === '' || !Number.isInteger(value) || value < 1 || value > 200
      ? 'Isi bilangan bulat 1–200.'
      : null;
  const isDirty = capacity !== null && value !== capacity.effectiveWeeklyPoints;
  const rangeError =
    startDate && endDate && endDate < startDate ? 'Tanggal selesai lebih awal.' : null;

  const submitTimeOff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!startDate || !endDate || rangeError) return;
    const saved = await onAddTimeOff({ startDate, endDate });
    if (saved !== false) {
      setStartDate('');
      setEndDate('');
      setShowForm(false);
    }
  };

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-[120px] items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400"
      >
        <LoadingSpinner size="sm" /> Memuat kapasitas…
      </div>
    );
  }

  if (error || !capacity) {
    return (
      <div className="space-y-2">
        <Alert tone="error" title="Kapasitas gagal dimuat">
          {error ?? 'Data kapasitas tidak tersedia.'}
        </Alert>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="personal-capacity-title" className="space-y-3">
        <div className="flex items-start gap-2">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-stone-700 dark:text-[#B1E743]" />
          <div>
            <h3
              id="personal-capacity-title"
              className="text-sm font-bold text-stone-900 dark:text-stone-100"
            >
              Kapasitas per minggu
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              Satu nilai untuk semua Workspace. XS 1 · S 2 · M 3 · L 5 · XL 8 poin. Sekarang{' '}
              <strong className="font-semibold text-stone-700 dark:text-stone-200">
                {capacity.effectiveWeeklyPoints} poin
              </strong>{' '}
              ({SOURCE_LABEL[capacity.source]}).
            </p>
          </div>
        </div>
        <Input
          id="personal-weekly-capacity"
          label="Poin per minggu"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          value={points}
          error={pointsError ?? undefined}
          onChange={(event) => setPoints(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!isDirty || Boolean(pointsError)}
            isLoading={isSaving}
            onClick={() => onSaveCapacity(value)}
          >
            Simpan kapasitas
          </Button>
          {capacity.source === 'override' && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isSaving}
              onClick={() => onSaveCapacity(null)}
            >
              Ikuti default Workspace
            </Button>
          )}
        </div>
      </section>

      <section
        aria-labelledby="personal-time-off-title"
        className="space-y-2 border-t border-stone-100 pt-4 dark:border-stone-800"
      >
        <div className="flex items-center justify-between gap-2">
          <h3
            id="personal-time-off-title"
            className="text-sm font-bold text-stone-900 dark:text-stone-100"
          >
            Cuti
          </h3>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setShowForm(true)}
            >
              Tambah cuti
            </Button>
          )}
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400">
          Hari cuti tidak dihitung sebagai hari kerja. Hanya tanggal yang disimpan, tanpa alasan.
        </p>

        {showForm && (
          <form
            onSubmit={(event) => void submitTimeOff(event)}
            className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                id="time-off-start"
                label="Mulai"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
              <Input
                id="time-off-end"
                label="Selesai"
                type="date"
                value={endDate}
                min={startDate || undefined}
                error={rangeError ?? undefined}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!startDate || !endDate || Boolean(rangeError)}
                isLoading={isSaving}
              >
                Simpan cuti
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Batal
              </Button>
            </div>
          </form>
        )}

        {capacity.timeOff.length === 0 ? (
          <p className="rounded-xl bg-stone-50 px-3 py-4 text-center text-[11px] text-stone-500 dark:bg-stone-900/60 dark:text-stone-400">
            Belum ada cuti yang akan datang.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
            {capacity.timeOff.map((item) => {
              const label = rangeLabel(item.startDate, item.endDate);
              return (
                <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    {label}
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus cuti ${label}`}
                    disabled={isSaving}
                    onClick={() => onRemoveTimeOff(item.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
