import React from 'react';
import { CheckSquare } from 'lucide-react';
import type { AcceptanceCriterion } from '@qlick/contracts';

import { Alert } from '../../../../atoms/Alert';
import { Checkbox } from '../../../../atoms/Checkbox';
import { Select } from '../../../../atoms/Select';
import { Skeleton } from '../../../../atoms/Skeleton';
import { Textarea } from '../../../../atoms/Textarea';
import { EmptyState } from '../../../../molecules/EmptyState';
import { Modal } from '../../../../molecules/Modal';

export interface AcMappingItem {
  criterion: AcceptanceCriterion;
  included: boolean;
  mappingStatus: 'mapped' | 'excluded';
  exclusionReason: string;
}

export interface AcMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  acMappingTarget: {
    testCaseId: string;
    title: string;
    versionId: string;
    revision: number;
  } | null;
  acMappingError: string | null;
  isLoadingAcMapping: boolean;
  isSavingAcMapping: boolean;
  acMappingItems: AcMappingItem[];
  updateAcceptanceCriteriaMappingItem: (
    criterionId: string,
    patch: Partial<{
      included: boolean;
      mappingStatus: 'mapped' | 'excluded';
      exclusionReason: string;
    }>,
  ) => void;
  onSaveAcceptanceCriteriaMapping: () => void;
}

export const AcMappingModal: React.FC<AcMappingModalProps> = ({
  isOpen,
  onClose,
  acMappingTarget,
  acMappingError,
  isLoadingAcMapping,
  isSavingAcMapping,
  acMappingItems,
  updateAcceptanceCriteriaMappingItem,
  onSaveAcceptanceCriteriaMapping,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSavingAcMapping && onClose()}
      title="Pemetaan Acceptance Criterion"
      description={
        acMappingTarget
          ? `${acMappingTarget.title} · Revision ${acMappingTarget.revision}. Pemetaan hanya dapat diubah selama masih draf.`
          : undefined
      }
      size="2xl"
      secondaryActionLabel="Batal"
      primaryActionLabel="Simpan Pemetaan"
      onPrimaryAction={() => void onSaveAcceptanceCriteriaMapping()}
      isPrimaryLoading={isSavingAcMapping}
      isPrimaryDisabled={isLoadingAcMapping || acMappingItems.length === 0}
    >
      <div className="space-y-3">
        <p className="text-xs text-stone-600 dark:text-stone-400">
          Pilih AC yang dicakup Test Case ini. AC yang sengaja tidak berlaku dapat dikecualikan,
          tetapi alasannya wajib dicatat untuk audit dan release gate berikutnya.
        </p>
        {acMappingError && (
          <Alert tone="error" title="Pemetaan belum dapat disimpan">
            {acMappingError}
          </Alert>
        )}
        {isLoadingAcMapping ? (
          <div className="space-y-2" aria-label="Memuat Acceptance Criterion">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : acMappingItems.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="h-6 w-6" />}
            title="Belum ada Acceptance Criterion aktif"
            description="Tambahkan Acceptance Criterion aktif pada Requirement terkait sebelum memetakan coverage Test Case."
          />
        ) : (
          <div className="space-y-2">
            {acMappingItems.map((item) => (
              <div
                key={item.criterion.id}
                className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/60"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <Checkbox
                    checked={item.included}
                    disabled={isSavingAcMapping}
                    onChange={(event) =>
                      updateAcceptanceCriteriaMappingItem(item.criterion.id, {
                        included: event.target.checked,
                      })
                    }
                    label={`${item.criterion.code} · ${item.criterion.text}`}
                    aria-label={`Pilih ${item.criterion.code}`}
                    className="items-start"
                  />
                  {item.included && (
                    <Select
                      value={item.mappingStatus}
                      onChange={(event) =>
                        updateAcceptanceCriteriaMappingItem(item.criterion.id, {
                          mappingStatus: event.target.value as 'mapped' | 'excluded',
                        })
                      }
                      disabled={isSavingAcMapping}
                      aria-label={`Status ${item.criterion.code}`}
                      className="min-w-36"
                    >
                      <option value="mapped">Dipetakan</option>
                      <option value="excluded">Dikecualikan</option>
                    </Select>
                  )}
                </div>
                {item.included && item.mappingStatus === 'excluded' && (
                  <Textarea
                    value={item.exclusionReason}
                    onChange={(event) =>
                      updateAcceptanceCriteriaMappingItem(item.criterion.id, {
                        exclusionReason: event.target.value,
                      })
                    }
                    disabled={isSavingAcMapping}
                    aria-label={`Alasan pengecualian ${item.criterion.code}`}
                    placeholder="Alasan pengecualian wajib dicatat..."
                    rows={2}
                    className="mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
