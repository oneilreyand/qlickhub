import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TestCaseImportPreviewResponse } from '@qlick/contracts';
import { TestCaseImportWizardModal } from '../TestCaseImportWizardModal';
import { testManagementService } from '../../../../../lib/api/testManagementService';

vi.mock('../../../../../lib/api/testManagementService', () => ({
  testManagementService: {
    downloadTemplate: vi.fn(),
    previewImport: vi.fn(),
    commitImport: vi.fn(),
    listImportAudits: vi.fn(),
    downloadErrorReport: vi.fn(),
  },
}));

const preview = (unmappedHeaders: string[] = []): TestCaseImportPreviewResponse => ({
  importSessionId: '10000000-0000-4000-8000-000000000001',
  fileName: 'test-cases.csv',
  contentHash: 'a'.repeat(64),
  templateVersion: '1.0',
  totalRows: 1,
  validRows: unmappedHeaders.length ? 0 : 1,
  invalidRows: unmappedHeaders.length ? 1 : 0,
  duplicateRows: 0,
  availableSheets: ['Sheet1'],
  selectedSheet: 'Sheet1',
  headers: ['Title', 'Requirement Code', ...unmappedHeaders],
  columnMapping: {
    Title: 'title',
    'Requirement Code': 'requirement_code',
    ...Object.fromEntries(unmappedHeaders.map((header) => [header, ''])),
  },
  unmappedHeaders,
  expiresAt: '2026-09-19T10:00:00.000Z',
  rows: [
    {
      sourceRowNumber: 2,
      externalReference: null,
      title: 'Imported case',
      requirementCode: 'REQ-001',
      resolvedRequirementId: '10000000-0000-4000-8000-000000000002',
      testType: 'manual',
      priority: 'medium',
      scenarioKind: 'positive',
      preconditions: null,
      steps: [],
      expectedResult: null,
      testData: null,
      status: 'draft',
      isValid: unmappedHeaders.length === 0,
      validationErrors: unmappedHeaders.length
        ? [`Column \"${unmappedHeaders[0]}\" is not recognized for row 2.`]
        : [],
      isDuplicate: false,
      existingTestCaseId: null,
    },
  ],
});

function csvFile(): File {
  const file = new File(['Title,Requirement Code\nImported case,REQ-001'], 'test-cases.csv');
  Object.defineProperty(file, 'text', {
    value: async () => 'Title,Requirement Code\nImported case,REQ-001',
  });
  return file;
}

describe('TestCaseImportWizardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the preview immediately when canonical CSV headers are mapped automatically', async () => {
    vi.mocked(testManagementService.previewImport).mockResolvedValue(preview());
    render(
      <TestCaseImportWizardModal
        isOpen
        onClose={vi.fn()}
        workspaceId="10000000-0000-4000-8000-000000000003"
        userRole="qa"
        onImportComplete={vi.fn()}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: {
        files: [csvFile()],
      },
    });

    await waitFor(() => expect(testManagementService.previewImport).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('heading', { name: 'Pratinjau Simulasi Impor' })).toBeInTheDocument();
    expect(screen.queryByText('Pemetaan Kolom Interaktif')).not.toBeInTheDocument();
    expect(screen.getByText('Imported case')).toBeInTheDocument();
  });

  it('opens mapping and identifies unknown spreadsheet headers', async () => {
    vi.mocked(testManagementService.previewImport).mockResolvedValue(
      preview(['Unsupported Source Field']),
    );
    render(
      <TestCaseImportWizardModal
        isOpen
        onClose={vi.fn()}
        workspaceId="10000000-0000-4000-8000-000000000003"
        userRole="qa"
        onImportComplete={vi.fn()}
      />,
    );

    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: {
        files: [csvFile()],
      },
    });

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Petakan Kolom Spreadsheet' }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Kolom belum dikenali: Unsupported Source Field/)).toBeInTheDocument();
  });
});
