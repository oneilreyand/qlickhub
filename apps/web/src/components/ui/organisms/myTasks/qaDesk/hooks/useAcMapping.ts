import { useState } from 'react';
import type {
  TaskTestExecutionWorkspace,
  TestCaseVersionAcceptanceCriterionMapping,
  TestCaseVersionCoverageSummary,
} from '@qlick/contracts';

import { requirementService } from '../../../../../../lib/api/requirementService';
import { testManagementService } from '../../../../../../lib/api/testManagementService';
import { useAppDispatch } from '../../../../../../store/hooks';
import { enqueueSnackbar } from '../../../../../../store/uiSlice';
import type { AcMappingItem } from '../dialogs/AcMappingModal';

export interface UseAcMappingOptions {
  workspaceId: string;
  versionCoverageByTestCaseId: Record<string, TestCaseVersionCoverageSummary | null>;
  setVersionCoverageByTestCaseId: React.Dispatch<
    React.SetStateAction<Record<string, TestCaseVersionCoverageSummary | null>>
  >;
}

export function useAcMapping({
  workspaceId,
  versionCoverageByTestCaseId,
  setVersionCoverageByTestCaseId,
}: UseAcMappingOptions) {
  const dispatch = useAppDispatch();
  const [acMappingTarget, setAcMappingTarget] = useState<{
    testCaseId: string;
    title: string;
    versionId: string;
    revision: number;
  } | null>(null);
  const [acMappingItems, setAcMappingItems] = useState<AcMappingItem[]>([]);
  const [isLoadingAcMapping, setIsLoadingAcMapping] = useState(false);
  const [isSavingAcMapping, setIsSavingAcMapping] = useState(false);
  const [acMappingError, setAcMappingError] = useState<string | null>(null);

  const openAcceptanceCriteriaMapping = async (
    testCase: TaskTestExecutionWorkspace['executions'][number]['testCase'],
  ) => {
    const latestVersion = versionCoverageByTestCaseId[testCase.id];
    if (!latestVersion || latestVersion.lifecycleStatus !== 'draft') return;

    setAcMappingTarget({
      testCaseId: testCase.id,
      title: testCase.title,
      versionId: latestVersion.id,
      revision: latestVersion.revision,
    });
    setAcMappingItems([]);
    setAcMappingError(null);
    setIsLoadingAcMapping(true);

    try {
      const [mappingResponse, requirementDetails] = await Promise.all([
        testManagementService.listTestCaseVersionAcceptanceCriteria(
          workspaceId,
          testCase.id,
          latestVersion.id,
        ),
        Promise.all(
          testCase.requirementIds.map((requirementId) =>
            requirementService.getRequirement(workspaceId, requirementId),
          ),
        ),
      ]);
      const existingMappings = new Map(
        mappingResponse.mappings.map((mapping) => [mapping.acceptanceCriterionId, mapping]),
      );
      const activeCriteria = Array.from(
        new Map(
          requirementDetails
            .flatMap((detail) => detail.acceptanceCriteria)
            .filter((criterion) => criterion.status === 'active')
            .map((criterion) => [criterion.id, criterion]),
        ).values(),
      ).sort((left, right) => left.code.localeCompare(right.code));
      setAcMappingItems(
        activeCriteria.map((criterion) => {
          const existing = existingMappings.get(criterion.id);
          return {
            criterion,
            included: Boolean(existing),
            mappingStatus: existing?.mappingStatus || 'mapped',
            exclusionReason: existing?.exclusionReason || '',
          };
        }),
      );
    } catch (error) {
      setAcMappingError(
        error instanceof Error ? error.message : 'Acceptance Criteria tidak dapat dimuat.',
      );
    } finally {
      setIsLoadingAcMapping(false);
    }
  };

  const updateAcceptanceCriteriaMappingItem = (
    criterionId: string,
    update: Partial<AcMappingItem>,
  ) => {
    setAcMappingItems((items) =>
      items.map((item) => (item.criterion.id === criterionId ? { ...item, ...update } : item)),
    );
  };

  const handleSaveAcceptanceCriteriaMapping = async () => {
    if (!acMappingTarget) return;
    const mappings: TestCaseVersionAcceptanceCriterionMapping[] = acMappingItems
      .filter((item) => item.included)
      .map((item) => ({
        acceptanceCriterionId: item.criterion.id,
        mappingStatus: item.mappingStatus,
        exclusionReason:
          item.mappingStatus === 'excluded' ? item.exclusionReason.trim() || null : undefined,
      }));
    const excludedWithoutReason = mappings.some(
      (mapping) => mapping.mappingStatus === 'excluded' && !mapping.exclusionReason,
    );
    if (mappings.length === 0) {
      setAcMappingError(
        'Pilih minimal satu Acceptance Criterion untuk dipetakan atau dikecualikan.',
      );
      return;
    }
    if (excludedWithoutReason) {
      setAcMappingError('Setiap Acceptance Criterion yang dikecualikan wajib memiliki alasan.');
      return;
    }

    try {
      setIsSavingAcMapping(true);
      setAcMappingError(null);
      await testManagementService.replaceTestCaseVersionAcceptanceCriteria(
        workspaceId,
        acMappingTarget.testCaseId,
        acMappingTarget.versionId,
        mappings,
      );
      const coverage = await testManagementService.listTestCaseVersionCoverage(
        workspaceId,
        acMappingTarget.testCaseId,
      );
      setVersionCoverageByTestCaseId((current) => ({
        ...current,
        [acMappingTarget.testCaseId]: coverage[0] || null,
      }));
      dispatch(
        enqueueSnackbar('Pemetaan Acceptance Criterion pada revision draf tersimpan', 'success'),
      );
      setAcMappingTarget(null);
    } catch (error) {
      setAcMappingError(
        error instanceof Error ? error.message : 'Pemetaan Acceptance Criterion gagal disimpan.',
      );
    } finally {
      setIsSavingAcMapping(false);
    }
  };

  return {
    acMappingTarget,
    setAcMappingTarget,
    acMappingItems,
    setAcMappingItems,
    isLoadingAcMapping,
    isSavingAcMapping,
    acMappingError,
    openAcceptanceCriteriaMapping,
    updateAcceptanceCriteriaMappingItem,
    handleSaveAcceptanceCriteriaMapping,
  };
}
