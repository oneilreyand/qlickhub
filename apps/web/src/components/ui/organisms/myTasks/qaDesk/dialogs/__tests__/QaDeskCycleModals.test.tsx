import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreateTestCycleModal } from '../CreateTestCycleModal';
import { StartQaTaskModal } from '../StartQaTaskModal';
import type { useQaTaskInitiation } from '../../hooks/useQaTaskInitiation';

describe('CreateTestCycleModal & StartQaTaskModal - Duplicate Resolved Bug Warning', () => {
  const resolvedBugVersions = [
    { build: 'checkout-2026.09.15', environment: 'staging' },
    { build: 'v1.0.0-bugfix', environment: 'production' },
  ];

  describe('CreateTestCycleModal', () => {
    it('does not display warning when build and environment do not match any resolved bug version', () => {
      render(
        <CreateTestCycleModal
          isOpen={true}
          onClose={vi.fn()}
          testCycleError={null}
          testCycleFingerprint="candidate:new-build-staging"
          setTestCycleFingerprint={vi.fn()}
          testCycleBuild="new-build-2026.10.01"
          setTestCycleBuild={vi.fn()}
          testCycleEnvironment="staging"
          setTestCycleEnvironment={vi.fn()}
          isCreatingTestCycle={false}
          onCreateTestCycle={vi.fn()}
          resolvedBugVersions={resolvedBugVersions}
        />,
      );

      expect(
        screen.queryByText('Gunakan nama build baru untuk versi hasil perbaikan'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Peringatan Versi Perbaikan')).not.toBeInTheDocument();
    });

    it('displays warning when build and environment match a resolved bug version', () => {
      render(
        <CreateTestCycleModal
          isOpen={true}
          onClose={vi.fn()}
          testCycleError={null}
          testCycleFingerprint="candidate:checkout-2026.09.15-staging"
          setTestCycleFingerprint={vi.fn()}
          testCycleBuild="checkout-2026.09.15"
          setTestCycleBuild={vi.fn()}
          testCycleEnvironment="staging"
          setTestCycleEnvironment={vi.fn()}
          isCreatingTestCycle={false}
          onCreateTestCycle={vi.fn()}
          resolvedBugVersions={resolvedBugVersions}
        />,
      );

      expect(screen.getByText('Peringatan Versi Perbaikan')).toBeInTheDocument();
      expect(
        screen.getByText('Gunakan nama build baru untuk versi hasil perbaikan'),
      ).toBeInTheDocument();
    });
  });

  describe('StartQaTaskModal', () => {
    const createMockInitiation = (
      build: string,
      environment: string,
    ): ReturnType<typeof useQaTaskInitiation> =>
      ({
        isModalOpen: true,
        openInitiationModal: vi.fn(),
        closeInitiationModal: vi.fn(),
        build,
        setBuild: vi.fn(),
        environment,
        setEnvironment: vi.fn(),
        candidateFingerprint: `candidate:${build}-${environment}`,
        setCandidateFingerprint: vi.fn(),
        testCaseTitle: 'Verifikasi Fitur Checkout',
        setTestCaseTitle: vi.fn(),
        testCaseSteps: ['Buka checkout'],
        setTestCaseSteps: vi.fn(),
        testCaseExpectedResult: 'Berhasil',
        setTestCaseExpectedResult: vi.fn(),
        selectedRequirementId: 'req-1',
        setSelectedRequirementId: vi.fn(),
        acMappings: [],
        setAcMappings: vi.fn(),
        updateAcMappingItem: vi.fn(),
        currentStep: 'idle',
        failedStep: null,
        errorMessage: null,
        buttonLabel: 'Simpan & Aktifkan',
        executeInitiation: vi.fn(),
        createdCycle: null,
        createdTestCaseId: null,
        createdTestCaseVersionId: null,
        isAcMapped: false,
        isActivated: false,
      }) as any;

    it('does not display warning when build and environment do not match any resolved bug version', () => {
      const initiation = createMockInitiation('checkout-fresh-build', 'staging');

      render(
        <StartQaTaskModal
          initiation={initiation}
          existingTestCycle={null}
          resolvedBugVersions={resolvedBugVersions}
        />,
      );

      expect(
        screen.queryByText('Gunakan nama build baru untuk versi hasil perbaikan'),
      ).not.toBeInTheDocument();
    });

    it('displays warning when build and environment match a resolved bug version', () => {
      const initiation = createMockInitiation('checkout-2026.09.15', 'staging');

      render(
        <StartQaTaskModal
          initiation={initiation}
          existingTestCycle={null}
          resolvedBugVersions={resolvedBugVersions}
        />,
      );

      expect(screen.getByText('Peringatan Versi Perbaikan')).toBeInTheDocument();
      expect(
        screen.getByText('Gunakan nama build baru untuk versi hasil perbaikan'),
      ).toBeInTheDocument();
    });
  });
});
