import { useCallback, useState } from 'react';
import type { RoleTemplate, WorkspaceMemberAssignment } from '@qlick/contracts';
import { memberAccessService } from '../../lib/api/memberAccessService';
import { useAppDispatch } from '../../store/hooks';
import { enqueueSnackbar } from '../../store/uiSlice';

/** MEMBER-ACCESS-HUB P4: load, save and delete the caller's role templates. */
export function useRoleTemplates() {
  const dispatch = useAppDispatch();
  const [templates, setTemplates] = useState<RoleTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTemplates(await memberAccessService.listTemplates());
    } catch (err) {
      setTemplates(null);
      setError(err instanceof Error ? err.message : 'Template gagal dimuat.');
    }
  }, []);

  const save = useCallback(
    async (name: string, assignments: WorkspaceMemberAssignment[]) => {
      try {
        const created = await memberAccessService.createTemplate({ name, entries: assignments });
        setTemplates((current) =>
          [...(current ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        dispatch(enqueueSnackbar(`Template "${created.name}" tersimpan.`, 'success'));
        return true;
      } catch (err) {
        dispatch(
          enqueueSnackbar(err instanceof Error ? err.message : 'Template gagal disimpan.', 'error'),
        );
        return false;
      }
    },
    [dispatch],
  );

  const remove = useCallback(
    async (template: RoleTemplate) => {
      setDeletingId(template.id);
      try {
        await memberAccessService.deleteTemplate(template.id);
        setTemplates((current) => current?.filter((item) => item.id !== template.id) ?? null);
        dispatch(enqueueSnackbar(`Template "${template.name}" dihapus.`, 'success'));
      } catch (err) {
        dispatch(
          enqueueSnackbar(err instanceof Error ? err.message : 'Template gagal dihapus.', 'error'),
        );
      } finally {
        setDeletingId(null);
      }
    },
    [dispatch],
  );

  return { templates, error, deletingId, load, save, remove };
}
