import React, { useCallback, useEffect, useState } from 'react';
import type { CreateUserTimeOffInput, UserCapacity } from '@qlick/contracts';
import { PersonalCapacityPanel } from '../../components/ui/organisms/PersonalCapacityPanel';
import { personalCapacityService } from '../../lib/api/personalCapacityService';
import { useAppDispatch } from '../../store/hooks';
import { enqueueSnackbar } from '../../store/uiSlice';

/** WORK-FOUNDATION P4: loads and saves the caller's own capacity and time off. */
export const MyCapacitySettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const [capacity, setCapacity] = useState<UserCapacity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCapacity(await personalCapacityService.getMine());
    } catch (err) {
      setCapacity(null);
      setError(err instanceof Error ? err.message : 'Kapasitas gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async <T,>(action: () => Promise<T>, success: string, failure: string) => {
    setIsSaving(true);
    try {
      const result = await action();
      dispatch(enqueueSnackbar(success, 'success'));
      return result;
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : failure, 'error'));
      return undefined;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCapacity = async (weeklyPoints: number | null) => {
    const updated = await run(
      () => personalCapacityService.updateMine({ weeklyPoints }),
      weeklyPoints === null
        ? 'Kapasitas kembali mengikuti default Workspace.'
        : 'Kapasitas tersimpan.',
      'Kapasitas gagal disimpan.',
    );
    if (updated) setCapacity(updated);
  };

  const handleAddTimeOff = async (input: CreateUserTimeOffInput) => {
    const added = await run(
      () => personalCapacityService.addMyTimeOff(input),
      'Cuti ditambahkan.',
      'Cuti gagal ditambahkan.',
    );
    if (!added) return false;
    setCapacity((current) =>
      current
        ? {
            ...current,
            timeOff: [...current.timeOff, added].sort((a, b) =>
              a.startDate.localeCompare(b.startDate),
            ),
          }
        : current,
    );
    return true;
  };

  const handleRemoveTimeOff = async (timeOffId: string) => {
    const removed = await run(
      async () => {
        await personalCapacityService.removeMyTimeOff(timeOffId);
        return true;
      },
      'Cuti dihapus.',
      'Cuti gagal dihapus.',
    );
    if (removed) {
      setCapacity((current) =>
        current
          ? { ...current, timeOff: current.timeOff.filter((item) => item.id !== timeOffId) }
          : current,
      );
    }
  };

  return (
    <PersonalCapacityPanel
      capacity={capacity}
      isLoading={isLoading}
      error={error}
      isSaving={isSaving}
      onRetry={() => void load()}
      onSaveCapacity={(points) => void handleSaveCapacity(points)}
      onAddTimeOff={handleAddTimeOff}
      onRemoveTimeOff={(id) => void handleRemoveTimeOff(id)}
    />
  );
};
