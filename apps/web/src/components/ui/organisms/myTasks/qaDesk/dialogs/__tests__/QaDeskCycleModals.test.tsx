import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreateTestCycleModal } from '../CreateTestCycleModal';
import { StartQaTaskModal } from '../StartQaTaskModal';
import type { useQaTaskInitiation } from '../../hooks/useQaTaskInitiation';

describe('CreateTestCycleModal & StartQaTaskModal - Dev Resolution Fingerprint & Mismatch Warning', () => {
  const devResolutionFingerprint = 'commit:dev-fix-123';

  describe('CreateTestCycleModal', () => {
    it('displays visible banner and does not warn when fingerprint matches dev resolution', () => {
      render(
        <CreateTestCycleModal
          isOpen={true}
          onClose={vi.fn()}
          testCycleError={null}
          testCycleFingerprint={devResolutionFingerprint}
          setTestCycleFingerprint={vi.fn()}
          testCycleBuild="fix-build-1"
          setTestCycleBuild={vi.fn()}
          testCycleEnvironment="staging"
          setTestCycleEnvironment={vi.fn()}
          isCreatingTestCycle={false}
          onCreateTestCycle={vi.fn()}
          devResolutionFingerprint={devResolutionFingerprint}
        />,
      );

      // Visible Dev resolution banner is displayed prominently
      expect(screen.getByText('Versi perbaikan dari Dev:')).toBeInTheDocument();
      expect(screen.getByText(devResolutionFingerprint)).toBeInTheDocument();

      // No mismatch warning
      expect(screen.queryByText('Peringatan Identitas Kandidat')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Identitas kandidat berbeda dari versi perbaikan/),
      ).not.toBeInTheDocument();
    });

    it('displays warning when candidate fingerprint does not match dev resolution fingerprint', () => {
      render(
        <CreateTestCycleModal
          isOpen={true}
          onClose={vi.fn()}
          testCycleError={null}
          testCycleFingerprint="candidate:different-build-staging"
          setTestCycleFingerprint={vi.fn()}
          testCycleBuild="different-build"
          setTestCycleBuild={vi.fn()}
          testCycleEnvironment="staging"
          setTestCycleEnvironment={vi.fn()}
          isCreatingTestCycle={false}
          onCreateTestCycle={vi.fn()}
          devResolutionFingerprint={devResolutionFingerprint}
        />,
      );

      expect(screen.getByText('Peringatan Identitas Kandidat')).toBeInTheDocument();
      expect(
        screen.getByText(
          `Identitas kandidat berbeda dari versi perbaikan yang diserahkan pengembang (${devResolutionFingerprint}). Retest akan gagal jika tidak cocok.`,
        ),
      ).toBeInTheDocument();
    });

    it('does not display dev banner or warning when devResolutionFingerprint is null', () => {
      render(
        <CreateTestCycleModal
          isOpen={true}
          onClose={vi.fn()}
          testCycleError={null}
          testCycleFingerprint="candidate:new-build-staging"
          setTestCycleFingerprint={vi.fn()}
          testCycleBuild="new-build"
          setTestCycleBuild={vi.fn()}
          testCycleEnvironment="staging"
          setTestCycleEnvironment={vi.fn()}
          isCreatingTestCycle={false}
          onCreateTestCycle={vi.fn()}
          devResolutionFingerprint={null}
        />,
      );

      expect(screen.queryByText('Versi perbaikan dari Dev:')).not.toBeInTheDocument();
      expect(screen.queryByText('Peringatan Identitas Kandidat')).not.toBeInTheDocument();
    });
  });

  describe('StartQaTaskModal', () => {
    const createMockInitiation = (
      candidateFingerprint: string,
    ): ReturnType<typeof useQaTaskInitiation> =>
      ({
        isModalOpen: true,
        openInitiationModal: vi.fn(),
        closeInitiationModal: vi.fn(),
        build: 'fix-build-1',
        setBuild: vi.fn(),
        environment: 'staging',
        setEnvironment: vi.fn(),
        candidateFingerprint,
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

    it('displays visible banner and does not warn when candidateFingerprint matches dev resolution', () => {
      const initiation = createMockInitiation(devResolutionFingerprint);

      render(
        <StartQaTaskModal
          initiation={initiation}
          existingTestCycle={null}
          devResolutionFingerprint={devResolutionFingerprint}
        />,
      );

      expect(screen.getByText('Versi perbaikan dari Dev:')).toBeInTheDocument();
      expect(screen.getByText(devResolutionFingerprint)).toBeInTheDocument();
      expect(screen.queryByText('Peringatan Identitas Kandidat')).not.toBeInTheDocument();
    });

    it('displays warning when candidateFingerprint differs from dev resolution candidate', () => {
      const initiation = createMockInitiation('candidate:mismatch-build-staging');

      render(
        <StartQaTaskModal
          initiation={initiation}
          existingTestCycle={null}
          devResolutionFingerprint={devResolutionFingerprint}
        />,
      );

      expect(screen.getByText('Peringatan Identitas Kandidat')).toBeInTheDocument();
      expect(
        screen.getByText(
          `Identitas kandidat berbeda dari versi perbaikan yang diserahkan pengembang (${devResolutionFingerprint}). Retest akan gagal jika tidak cocok.`,
        ),
      ).toBeInTheDocument();
    });
  });
});
