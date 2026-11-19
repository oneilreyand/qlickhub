import React, { useCallback, useEffect, useState } from 'react';
import type {
  CreateWorkspaceHolidayInput,
  UpdateWorkCalendarInput,
  WorkCalendar,
} from '@qlick/contracts';
import { Link } from 'react-router-dom';
import { WorkCalendarCard } from '../../components/ui/organisms/WorkCalendarCard';
import { workspaceService } from '../../lib/api/workspaceService';
import { useAppDispatch } from '../../store/hooks';
import { enqueueSnackbar } from '../../store/uiSlice';

/** WORK-FOUNDATION P2: loads and saves the Workspace work calendar through the backend. */
export const WorkCalendarSettings: React.FC<{ workspaceId: string; canManage: boolean }> = ({
  workspaceId,
  canManage,
}) => {
  const dispatch = useAppDispatch();
  const [calendar, setCalendar] = useState<WorkCalendar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCalendar(await workspaceService.getWorkCalendar(workspaceId));
    } catch (err) {
      setCalendar(null);
      setError(err instanceof Error ? err.message : 'Kalender kerja gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

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

  const handleSave = async (input: UpdateWorkCalendarInput) => {
    const updated = await run(
      () => workspaceService.updateWorkCalendar(workspaceId, input),
      'Kalender kerja tersimpan.',
      'Kalender kerja gagal disimpan.',
    );
    if (updated) setCalendar(updated);
  };

  const handleAddHoliday = async (input: CreateWorkspaceHolidayInput) => {
    const holiday = await run(
      () => workspaceService.addWorkspaceHoliday(workspaceId, input),
      'Hari libur ditambahkan.',
      'Hari libur gagal ditambahkan.',
    );
    if (!holiday) return false;
    setCalendar((current) =>
      current
        ? {
            ...current,
            holidays: [...current.holidays, holiday].sort((a, b) => a.date.localeCompare(b.date)),
          }
        : current,
    );
    return true;
  };

  const handleRemoveHoliday = async (holidayId: string) => {
    const removed = await run(
      async () => {
        await workspaceService.removeWorkspaceHoliday(workspaceId, holidayId);
        return true;
      },
      'Hari libur dihapus.',
      'Hari libur gagal dihapus.',
    );
    if (removed) {
      setCalendar((current) =>
        current
          ? { ...current, holidays: current.holidays.filter((item) => item.id !== holidayId) }
          : current,
      );
    }
  };

  return (
    <WorkCalendarCard
      calendar={calendar}
      isLoading={isLoading}
      error={error}
      canManage={canManage}
      isSaving={isSaving}
      onRetry={() => void load()}
      onSave={(input) => void handleSave(input)}
      onAddHoliday={handleAddHoliday}
      onRemoveHoliday={(id) => void handleRemoveHoliday(id)}
      peopleLink={
        canManage ? (
          <Link to="/members" className="font-semibold underline underline-offset-2">
            Tim & Akses
          </Link>
        ) : undefined
      }
    />
  );
};
