import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Info,
  RotateCcw,
  Upload,
  X,
  XCircle,
  Layers,
} from 'lucide-react';
import type {
  TestCaseImportAudit,
  TestCaseImportMode,
  TestCaseImportPreviewResponse,
  TestCaseImportResult,
  WorkspaceRole,
} from '@qlick/contracts';
import { MAX_IMPORT_ROWS } from '@qlick/contracts';
import { testManagementService } from '../../../../lib/api/testManagementService';
import { Button } from '../../atoms/Button';
import { IconButton } from '../../atoms/IconButton';
import { Modal } from '../../molecules/Modal';

export interface TestCaseImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userRole: WorkspaceRole;
  onImportComplete: () => void;
}

type WizardStep = 'upload' | 'mapping' | 'preview' | 'result' | 'history';

const TARGET_FIELDS = [
  { key: '', label: '(Ignore / Do Not Import)' },
  { key: 'title', label: 'Title (Required)' },
  { key: 'requirement_code', label: 'Requirement Code (Required)' },
  { key: 'external_reference', label: 'External Reference / Test Case ID' },
  { key: 'steps', label: 'Steps / Procedure' },
  { key: 'expected_result', label: 'Expected Result' },
  { key: 'test_data', label: 'Test Data' },
  { key: 'priority', label: 'Priority (high, medium, low)' },
  { key: 'scenario_kind', label: 'Scenario Kind (positive, negative)' },
  { key: 'test_type', label: 'Test Type (manual, e2e, integration, unit)' },
  { key: 'preconditions', label: 'Preconditions' },
];

export const TestCaseImportWizardModal: React.FC<TestCaseImportWizardModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  userRole,
  onImportComplete,
}) => {
  const [step, setStep] = useState<WizardStep>('upload');
  const [previewData, setPreviewData] = useState<TestCaseImportPreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<TestCaseImportMode>('create_only');
  const [selectedSheet, setSelectedSheet] = useState<string>('Sheet1');
  const [activeFile, setActiveFile] = useState<{
    name: string;
    content?: string;
    base64?: string;
  } | null>(null);
  const [importResult, setImportResult] = useState<TestCaseImportResult | null>(null);
  const [audits, setAudits] = useState<TestCaseImportAudit[]>([]);
  const canUpdateImportedCases = userRole === 'owner' || userRole === 'admin' || userRole === 'po';

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setPreviewData(null);
      setColumnMapping({});
      setImportResult(null);
      setActiveFile(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleDownloadTemplate = async () => {
    try {
      const csv = await testManagementService.downloadTemplate(workspaceId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test_cases_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage('Failed to download template CSV.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const isXlsx = file.name.endsWith('.xlsx');
      if (isXlsx) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            setActiveFile({ name: file.name, base64 });
            const preview = await testManagementService.previewImport(
              workspaceId,
              file.name,
              undefined,
              base64,
            );
            setPreviewData(preview);
            setSelectedSheet(preview.selectedSheet || 'Sheet1');
            setColumnMapping(preview.columnMapping || {});
            setStep(preview.headers && preview.headers.length > 0 ? 'mapping' : 'preview');
          } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Failed to parse XLSX file.');
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setActiveFile({ name: file.name, content: text });
        const preview = await testManagementService.previewImport(workspaceId, file.name, text);
        setPreviewData(preview);
        setSelectedSheet('Sheet1');
        setColumnMapping(preview.columnMapping || {});
        setStep(preview.headers && preview.headers.length > 0 ? 'mapping' : 'preview');
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse spreadsheet.');
      setLoading(false);
    }
  };

  const handleApplyMapping = async () => {
    if (!activeFile) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const preview = await testManagementService.previewImport(
        workspaceId,
        activeFile.name,
        activeFile.content,
        activeFile.base64,
        selectedSheet,
        columnMapping,
      );
      setPreviewData(preview);
      setStep('preview');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate dry-run preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = async (newSheet: string) => {
    if (!activeFile || newSheet === selectedSheet) return;
    setLoading(true);
    setErrorMessage(null);
    setSelectedSheet(newSheet);
    try {
      const preview = await testManagementService.previewImport(
        workspaceId,
        activeFile.name,
        activeFile.content,
        activeFile.base64,
        newSheet,
        columnMapping,
      );
      setPreviewData(preview);
      setColumnMapping(preview.columnMapping || {});
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse selected sheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await testManagementService.commitImport(workspaceId, {
        importSessionId: previewData.importSessionId,
        contentHash: previewData.contentHash,
        mode: importMode,
        sheetName: selectedSheet,
      });
      setImportResult(result);
      setStep('result');
      onImportComplete();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Import commit failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrorReport = async (importId: string) => {
    try {
      const csv = await testManagementService.downloadErrorReport(workspaceId, importId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_errors_${importId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage('Failed to download error report.');
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const list = await testManagementService.listImportAudits(workspaceId);
      setAudits(list);
      setStep('history');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load audit history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'history'
          ? 'Import History & Audit Log'
          : step === 'result'
            ? 'Import Completed'
            : step === 'mapping'
              ? 'Map Spreadsheet Columns'
              : step === 'preview'
                ? 'Import Dry-Run Preview'
                : 'Import Test Cases from Spreadsheet'
      }
      description="Batch intake CSV or XLSX test cases with automatic requirement linking and idempotency."
      size="4xl"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <IconButton
              label="Dismiss import error"
              onClick={() => setErrorMessage(null)}
              variant="danger"
              className="text-red-400 hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        )}

        {/* STEP 1: UPLOAD & TEMPLATE */}
        {step === 'upload' && (
          <div className="space-y-6 py-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Standard Spreadsheet Template
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Includes columns for Test Case ID, Title, Requirement Code, Steps, and Priority.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download Template (CSV)
              </Button>
            </div>

            {/* Dropzone */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-primary/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors bg-slate-900/40">
              <input
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileUpload}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3 border border-slate-700">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                {loading
                  ? 'Analyzing spreadsheet...'
                  : 'Drop your CSV or XLSX file here, or browse'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports standard CSV and XLSX formats up to {MAX_IMPORT_ROWS} rows.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={loadHistory}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <History className="w-4 h-4" />
                View Past Import Audits
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: INTERACTIVE COLUMN MAPPING */}
        {step === 'mapping' && previewData && (
          <div className="space-y-4 max-h-[70vh] flex flex-col">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300">
              <p className="font-semibold text-slate-200 mb-1">Interactive Column Mapping</p>
              <p>
                Verify or adjust how columns from{' '}
                <strong className="text-primary">{activeFile?.name}</strong> map to canonical Test
                Case fields.
              </p>
            </div>

            {/* Sheet selection bar (if multi-sheet XLSX) */}
            {previewData.availableSheets && previewData.availableSheets.length > 1 && (
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Select Sheet / Tab:</span>
                </div>
                <select
                  aria-label="Select spreadsheet sheet"
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  disabled={loading}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                >
                  {previewData.availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mapping Grid */}
            <div className="flex-1 overflow-auto border border-slate-700 rounded-xl bg-slate-900/60 p-3 space-y-2 max-h-[42vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-semibold text-xs text-slate-400 border-b border-slate-800 pb-2 px-1">
                <span>Spreadsheet Column Header</span>
                <span>Target Canonical Field</span>
              </div>
              {(previewData.headers || []).map((header) => {
                const currentTarget = columnMapping[header] || '';
                return (
                  <div
                    key={header}
                    className="grid grid-cols-1 sm:grid-cols-2 items-center gap-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/60 text-xs"
                  >
                    <div className="font-mono text-slate-200 truncate" title={header}>
                      {header}
                    </div>
                    <div>
                      <select
                        aria-label={`Target field for column ${header}`}
                        value={currentTarget}
                        onChange={(e) => {
                          const val = e.target.value;
                          setColumnMapping((prev) => ({
                            ...prev,
                            [header]: val,
                          }));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                      >
                        {TARGET_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep('upload')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Upload
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyMapping}
                disabled={loading}
                leftIcon={<ArrowRight className="w-4 h-4" />}
              >
                {loading ? 'Analyzing...' : 'Next: Dry-Run Preview'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW DRY-RUN */}
        {step === 'preview' && previewData && (
          <div className="space-y-4 max-h-[70vh] flex flex-col">
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <span className="text-xs text-slate-400">Total Parsed</span>
                <p className="text-lg font-bold text-slate-100">{previewData.totalRows}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-400">Valid Rows</span>
                <p className="text-lg font-bold text-emerald-400">{previewData.validRows}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-xs text-red-400">Invalid Rows</span>
                <p className="text-lg font-bold text-red-400">{previewData.invalidRows}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs text-amber-400">Duplicates Found</span>
                <p className="text-lg font-bold text-amber-400">{previewData.duplicateRows}</p>
              </div>
            </div>

            {/* Sheet selection bar (if multi-sheet XLSX) */}
            {previewData.availableSheets && previewData.availableSheets.length > 1 && (
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Select Sheet / Tab:</span>
                </div>
                <select
                  aria-label="Select spreadsheet sheet"
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  disabled={loading}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                >
                  {previewData.availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Info className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Import Strategy for duplicate Test Case IDs:</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="create_only"
                    checked={importMode === 'create_only'}
                    onChange={() => setImportMode('create_only')}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-slate-200">Skip Existing (Create Only)</span>
                </label>
                {canUpdateImportedCases ? (
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="importMode"
                      value="update"
                      checked={importMode === 'update'}
                      onChange={() => setImportMode('update')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-slate-200">Update Existing Fields</span>
                  </label>
                ) : (
                  <span className="ml-3 text-slate-400">QA imports are create-only drafts.</span>
                )}
              </div>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-auto border border-slate-700 rounded-xl bg-slate-900/60 max-h-[40vh]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Requirement</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {previewData.rows.map((row) => (
                    <tr
                      key={row.sourceRowNumber}
                      className={
                        !row.isValid ? 'bg-red-500/5' : row.isDuplicate ? 'bg-amber-500/5' : ''
                      }
                    >
                      <td className="px-3 py-2 font-mono text-slate-400">{row.sourceRowNumber}</td>
                      <td className="px-3 py-2 font-mono">{row.externalReference || '-'}</td>
                      <td className="px-3 py-2 font-medium max-w-[200px] truncate text-slate-200">
                        {row.title || '(No title)'}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {row.resolvedRequirementId ? (
                          <span className="text-emerald-400">{row.requirementCode}</span>
                        ) : (
                          <span className="text-red-400">{row.requirementCode || 'Missing'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 uppercase text-[10px]">{row.priority}</td>
                      <td className="px-3 py-2">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {row.isDuplicate
                              ? importMode === 'update'
                                ? 'Will Update'
                                : 'Will Skip'
                              : 'Ready'}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-red-400 truncate max-w-[180px]"
                            title={row.validationErrors.join('; ')}
                          >
                            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {row.validationErrors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setStep(
                    previewData.headers && previewData.headers.length > 0 ? 'mapping' : 'upload',
                  )
                }
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                {previewData.headers && previewData.headers.length > 0
                  ? 'Back to Column Mapping'
                  : 'Back to Upload'}
              </Button>
              <Button
                variant="primary"
                onClick={handleCommit}
                disabled={loading || previewData.validRows === 0}
                leftIcon={<ArrowRight className="w-4 h-4" />}
              >
                {loading ? 'Importing...' : `Commit Import (${previewData.validRows} Valid Rows)`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT */}
        {step === 'result' && importResult && (
          <div className="space-y-5 py-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">Import Process Complete</h3>
              <p className="text-xs text-slate-400 mt-1">
                Source File: {importResult.sourceFileName} &bull; Mode: {importResult.mode}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-400">Created</span>
                <p className="text-xl font-bold text-emerald-400">{importResult.createdRows}</p>
              </div>
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <span className="text-xs text-sky-400">Updated</span>
                <p className="text-xl font-bold text-sky-400">{importResult.updatedRows}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-xs text-slate-400">Skipped</span>
                <p className="text-xl font-bold text-slate-200">{importResult.skippedRows}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-xs text-red-400">Failed</span>
                <p className="text-xl font-bold text-red-400">{importResult.failedRows}</p>
              </div>
            </div>

            {importResult.failedRows > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-left max-w-lg mx-auto space-y-2">
                <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Some rows could not be imported</span>
                </div>
                <p className="text-xs text-slate-300">
                  You can download a CSV error report containing row numbers and reasons for
                  failure.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadErrorReport(importResult.importId)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download Error Report (CSV)
                </Button>
              </div>
            )}

            <div className="pt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Import Another File
              </Button>
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: HISTORY AUDITS */}
        {step === 'history' && (
          <div className="space-y-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('upload')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Import
              </Button>
            </div>

            <div className="flex-1 overflow-auto border border-slate-700 rounded-xl bg-slate-900/60 max-h-[50vh]">
              {audits.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No import history recorded yet for this workspace.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-700">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">File</th>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2">Outcomes</th>
                      <th className="px-3 py-2">Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {audits.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                          {new Date(a.createdAt).toLocaleDateString()}{' '}
                          {new Date(a.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-200">{a.sourceFileName}</td>
                        <td className="px-3 py-2 text-slate-300">{a.actorName || 'QA Member'}</td>
                        <td className="px-3 py-2 uppercase text-[10px] font-mono">{a.mode}</td>
                        <td className="px-3 py-2">
                          <span className="text-emerald-400 font-bold">{a.createdRows}c</span> /{' '}
                          <span className="text-sky-400 font-bold">{a.updatedRows}u</span> /{' '}
                          <span className="text-slate-400">{a.skippedRows}s</span> /{' '}
                          <span className="text-red-400 font-bold">{a.failedRows}f</span>
                        </td>
                        <td className="px-3 py-2">
                          {a.failedRows > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleDownloadErrorReport(a.id)}
                              className="text-red-400 hover:text-red-300 inline-flex items-center gap-1 font-medium"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Errors CSV
                            </button>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
