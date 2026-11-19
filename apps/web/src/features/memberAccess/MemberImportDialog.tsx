import React, { useState } from 'react';
import type { MemberImportResult, MemberImportRowInput } from '@qlick/contracts';
import { MemberImportModal } from '../../components/ui/organisms/MemberImportModal';
import { memberAccessService } from '../../lib/api/memberAccessService';
import { useAppDispatch } from '../../store/hooks';
import { enqueueSnackbar } from '../../store/uiSlice';

/** MEMBER-ACCESS-HUB P4: CSV import — preview on the server, then commit the valid rows. */
export const MemberImportDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}> = ({ isOpen, onClose, onImported }) => {
  const dispatch = useAppDispatch();
  const [preview, setPreview] = useState<MemberImportResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const close = () => {
    setPreview(null);
    onClose();
  };

  const send = async (mode: 'preview' | 'commit', rows: MemberImportRowInput[]) => {
    setIsBusy(true);
    try {
      const result = await memberAccessService.importMembers({ mode, rows });
      if (mode === 'preview') {
        setPreview(result);
        return;
      }
      dispatch(
        enqueueSnackbar(
          `${result.validCount} akses diberikan ke ${result.peopleInvited} orang.${
            result.invalidCount > 0 ? ` ${result.invalidCount} baris dilewati.` : ''
          }`,
          'success',
        ),
      );
      close();
      onImported();
    } catch (error) {
      dispatch(
        enqueueSnackbar(error instanceof Error ? error.message : 'Impor gagal diproses.', 'error'),
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <MemberImportModal
      isOpen={isOpen}
      onClose={close}
      preview={preview}
      isBusy={isBusy}
      onPreview={(rows) => void send('preview', rows)}
      onCommit={(rows) => void send('commit', rows)}
      onBack={() => setPreview(null)}
    />
  );
};
