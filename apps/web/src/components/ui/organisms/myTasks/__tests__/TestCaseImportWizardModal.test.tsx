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
    fetchGoogleSheetForImport: vi.fn(),
    updateImportRowRequirement: vi.fn(),
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
  ignoredHeaders: [],
  allowedRequirementCodes: [],
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
        ? [`Column "${unmappedHeaders[0]}" is not recognized for row 2.`]
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

  it('fetches a Google Sheets link, scopes the preview to the QA subtask, and explains rejected rows', async () => {
    vi.mocked(testManagementService.fetchGoogleSheetForImport).mockResolvedValue({
      fileName: 'google-sheet-0.csv',
      fileContent: 'Title,Requirement Code\nImported case,REQ-001',
      sheetGid: '0',
    });
    vi.mocked(testManagementService.previewImport).mockResolvedValue({
      ...preview(),
      totalRows: 3,
      validRows: 1,
      invalidRows: 2,
      ignoredHeaders: ['Status', 'Evidance'],
      allowedRequirementCodes: ['REQ-001', 'REQ-002'],
    });
    render(
      <TestCaseImportWizardModal
        isOpen
        onClose={vi.fn()}
        workspaceId="10000000-0000-4000-8000-000000000003"
        userRole="qa"
        qaSubtaskId="10000000-0000-4000-8000-000000000009"
        onImportComplete={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: 'Ambil dari Google Sheets' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Atau tempel tautan Google Sheets'), {
      target: { value: 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0' },
    });
    fireEvent.click(button);

    await waitFor(() =>
      expect(testManagementService.fetchGoogleSheetForImport).toHaveBeenCalledWith(
        '10000000-0000-4000-8000-000000000003',
        'https://docs.google.com/spreadsheets/d/abc/edit#gid=0',
      ),
    );
    await waitFor(() =>
      expect(testManagementService.previewImport).toHaveBeenCalledWith(
        '10000000-0000-4000-8000-000000000003',
        'google-sheet-0.csv',
        'Title,Requirement Code\nImported case,REQ-001',
        undefined,
        undefined,
        undefined,
        '10000000-0000-4000-8000-000000000009',
      ),
    );
    expect(await screen.findByText('2 baris tidak akan diimpor.')).toBeInTheDocument();
    expect(screen.getByText('REQ-001, REQ-002')).toBeInTheDocument();
    expect(screen.getByText(/Kolom tidak diimpor: Status, Evidance/)).toBeInTheDocument();
  });

  it('shows the API error when the Google Sheet is not shared', async () => {
    vi.mocked(testManagementService.fetchGoogleSheetForImport).mockRejectedValue(
      new Error('Spreadsheet tidak dapat dibaca.'),
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
    fireEvent.change(screen.getByLabelText('Atau tempel tautan Google Sheets'), {
      target: { value: 'https://docs.google.com/spreadsheets/d/abc/edit' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ambil dari Google Sheets' }));
    expect(await screen.findByText('Spreadsheet tidak dapat dibaca.')).toBeInTheDocument();
  });

  it('lets the QA pick a valid Requirement for a rejected row without touching the sheet', async () => {
    const base = preview();
    const rejected = {
      ...base.rows[0],
      requirementCode: 'REQ-001',
      resolvedRequirementId: null,
      isValid: false,
      validationErrors: ['Requirement "REQ-001" tidak ada di aplikasi.'],
    };
    vi.mocked(testManagementService.fetchGoogleSheetForImport).mockResolvedValue({
      fileName: 'google-sheet-1.csv',
      fileContent: 'Title,Requirement Code\nImported case,REQ-001',
      sheetGid: '1',
    });
    vi.mocked(testManagementService.previewImport).mockResolvedValue({
      ...base,
      validRows: 0,
      invalidRows: 1,
      allowedRequirementCodes: ['REQ-9SQ1', 'REQ-9TS2'],
      rows: [rejected],
    });
    vi.mocked(testManagementService.updateImportRowRequirement).mockResolvedValue({
      rows: [
        {
          ...rejected,
          requirementCode: 'REQ-9SQ1',
          resolvedRequirementId: '10000000-0000-4000-8000-000000000002',
          isValid: true,
          validationErrors: [],
        },
      ],
      validRows: 1,
      invalidRows: 0,
      duplicateRows: 0,
    });
    render(
      <TestCaseImportWizardModal
        isOpen
        onClose={vi.fn()}
        workspaceId="10000000-0000-4000-8000-000000000003"
        userRole="qa"
        qaSubtaskId="10000000-0000-4000-8000-000000000009"
        onImportComplete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Atau tempel tautan Google Sheets'), {
      target: { value: 'https://docs.google.com/spreadsheets/d/abc/edit#gid=1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ambil dari Google Sheets' }));

    const rowSelect = await screen.findByLabelText('Ganti Requirement baris 2');
    fireEvent.change(rowSelect, { target: { value: 'REQ-9SQ1' } });

    await waitFor(() =>
      expect(testManagementService.updateImportRowRequirement).toHaveBeenCalledWith(
        '10000000-0000-4000-8000-000000000003',
        {
          importSessionId: '10000000-0000-4000-8000-000000000001',
          requirementCode: 'REQ-9SQ1',
          sourceRowNumbers: [2],
          qaSubtaskId: '10000000-0000-4000-8000-000000000009',
        },
      ),
    );
    expect(await screen.findByRole('button', { name: 'Impor 1 Baris Valid' })).toBeEnabled();
    expect(screen.queryByLabelText('Ganti Requirement baris 2')).not.toBeInTheDocument();
  });
});
