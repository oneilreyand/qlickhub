import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck, Plus, Send, Trash2, X } from 'lucide-react';
import type {
  CanonicalTestCaseType,
  TestCase,
  TestCaseDefinitionStatus,
  TestCasePriority,
  TestCaseScenarioKind,
  WorkspaceRole,
} from '@qlick/contracts';
import { testManagementService } from '../../../../lib/api/testManagementService';
import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { IconButton } from '../../atoms/IconButton';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Textarea } from '../../atoms/Textarea';
import { Modal } from '../../molecules/Modal';

export interface RequirementOption {
  id: string;
  code: string;
  title: string;
}

export interface TestCaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userRole: WorkspaceRole;
  requirements: RequirementOption[];
  initialTestCase?: TestCase | null;
  onSuccess: (testCase: TestCase) => void;
}

export const TestCaseFormModal: React.FC<TestCaseFormModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  userRole,
  requirements,
  initialTestCase,
  onSuccess,
}) => {
  const isEditing = Boolean(initialTestCase);

  const [title, setTitle] = useState(initialTestCase?.title || '');
  const [priority, setPriority] = useState<TestCasePriority>(initialTestCase?.priority || 'medium');
  const [scenarioKind, setScenarioKind] = useState<TestCaseScenarioKind>(
    initialTestCase?.scenarioKind || 'positive',
  );
  const [testType, setTestType] = useState<CanonicalTestCaseType>(
    initialTestCase?.testType || 'manual',
  );
  const [preconditions, setPreconditions] = useState(initialTestCase?.preconditions || '');
  const [steps, setSteps] = useState<string[]>(
    initialTestCase?.steps && initialTestCase.steps.length > 0 ? initialTestCase.steps : [''],
  );
  const [expectedResult, setExpectedResult] = useState(initialTestCase?.expectedResult || '');
  const [testData, setTestData] = useState(initialTestCase?.testData || '');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>(
    initialTestCase?.requirementIds || (requirements[0] ? [requirements[0].id] : []),
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPoOrAdmin = userRole === 'owner' || userRole === 'admin' || userRole === 'po';

  useEffect(() => {
    if (!isOpen) return;

    setTitle(initialTestCase?.title || '');
    setPriority(initialTestCase?.priority || 'medium');
    setScenarioKind(initialTestCase?.scenarioKind || 'positive');
    setTestType(initialTestCase?.testType || 'manual');
    setPreconditions(initialTestCase?.preconditions || '');
    setSteps(
      initialTestCase?.steps && initialTestCase.steps.length > 0 ? initialTestCase.steps : [''],
    );
    setExpectedResult(initialTestCase?.expectedResult || '');
    setTestData(initialTestCase?.testData || '');
    setSelectedReqIds(
      initialTestCase?.requirementIds || (requirements[0] ? [requirements[0].id] : []),
    );
    setErrorMessage(null);
  }, [initialTestCase, isOpen, requirements]);

  const handleAddStep = () => {
    setSteps((prev) => [...prev, '']);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, val: string) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const toggleRequirement = (reqId: string) => {
    setSelectedReqIds((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId],
    );
  };

  const handleSubmit = async (targetStatus: TestCaseDefinitionStatus) => {
    setErrorMessage(null);
    if (!title.trim()) {
      setErrorMessage('Judul Test Case wajib diisi.');
      return;
    }
    if (selectedReqIds.length === 0) {
      setErrorMessage('Pilih minimal satu Requirement untuk ditautkan ke Test Case ini.');
      return;
    }

    const filteredSteps = steps.map((s) => s.trim()).filter((s) => s.length > 0);

    setLoading(true);
    try {
      if (isEditing && initialTestCase) {
        const updated = await testManagementService.updateTestCase(
          workspaceId,
          initialTestCase.id,
          {
            title: title.trim(),
            priority,
            status: targetStatus,
            scenarioKind,
            testType,
            preconditions: preconditions.trim() || null,
            steps: filteredSteps,
            expectedResult: expectedResult.trim() || null,
            testData: testData.trim() || null,
            requirementIds: selectedReqIds,
          },
        );
        onSuccess(updated);
        onClose();
      } else {
        const created = await testManagementService.createTestCase(workspaceId, {
          title: title.trim(),
          priority,
          status: 'draft',
          scenarioKind,
          source: 'native',
          testType,
          preconditions: preconditions.trim() || null,
          steps: filteredSteps,
          expectedResult: expectedResult.trim() || null,
          testData: testData.trim() || null,
          requirementIds: selectedReqIds,
        });
        const saved =
          targetStatus === 'in_review'
            ? await testManagementService.updateTestCase(workspaceId, created.id, {
                status: 'in_review',
              })
            : created;
        onSuccess(saved);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test Case gagal disimpan.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Test Case' : 'Buat Test Case Baru'}
      description="Buat Test Case standar yang tertaut ke Requirement dan mendukung seluruh siklus kerja."
      size="3xl"
    >
      <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
        {errorMessage && (
          <div className="relative">
            <Alert tone="error">
              <span className="block pr-10">{errorMessage}</span>
            </Alert>
            <IconButton
              label="Tutup pesan error"
              size="sm"
              variant="danger"
              onClick={() => setErrorMessage(null)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        )}

        {/* Basic fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              id="test-case-title"
              label="Judul *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Verifikasi checkout kartu pelanggan lama"
              required
            />
          </div>

          <div>
            <Input
              id="test-case-external-reference"
              label="Nomor Test Case"
              value={initialTestCase?.externalReference || 'Otomatis saat disimpan'}
              readOnly
              aria-describedby="test-case-external-reference-help"
              className="cursor-default bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            />
            <p
              id="test-case-external-reference-help"
              className="mt-1 text-xs text-stone-500 dark:text-stone-400"
            >
              Nomor unik dibuat otomatis per Workspace.
            </p>
          </div>
        </div>

        {/* Metadata Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            id="test-case-priority"
            label="Prioritas"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TestCasePriority)}
          >
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </Select>

          <Select
            id="test-case-scenario-kind"
            label="Jenis Skenario"
            value={scenarioKind}
            onChange={(e) => setScenarioKind(e.target.value as TestCaseScenarioKind)}
          >
            <option value="positive">Positif (Alur Utama)</option>
            <option value="negative">Negatif (Kasus Khusus / Error)</option>
            <option value="edge">Edge Case (Kondisi Batas)</option>
          </Select>

          <Select
            id="test-case-test-type"
            label="Jenis Pengujian"
            value={testType}
            onChange={(e) => setTestType(e.target.value as CanonicalTestCaseType)}
          >
            <option value="manual">Manual</option>
            <option value="e2e">E2E</option>
            <option value="integration">Integrasi</option>
            <option value="unit">Unit</option>
          </Select>
        </div>

        {/* Linked Requirements */}
        <fieldset>
          <legend className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
            Requirement Tertaut <span className="text-rose-600 dark:text-rose-400">*</span>
          </legend>
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-2 dark:border-stone-800 dark:bg-stone-900">
            {requirements.map((req) => {
              const isSelected = selectedReqIds.includes(req.id);
              return (
                <button
                  type="button"
                  key={req.id}
                  onClick={() => toggleRequirement(req.id)}
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500 text-[#141413] font-semibold hover:bg-brand-600'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <span className="font-mono">{req.code}</span>
                  <span className="truncate max-w-[150px]">{req.title}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Preconditions */}
        <Textarea
          id="test-case-preconditions"
          label="Prasyarat"
          value={preconditions}
          onChange={(e) => setPreconditions(e.target.value)}
          placeholder="Contoh: Pengguna sudah masuk dan memiliki item di keranjang"
          rows={2}
        />

        {/* Steps List Builder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Langkah Pengujian
            </span>
            <Button variant="ghost" onClick={handleAddStep} leftIcon={<Plus className="h-4 w-4" />}>
              Tambah Langkah
            </Button>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-6 flex-shrink-0 text-right font-mono text-xs text-stone-500 dark:text-stone-400">
                  {index + 1}.
                </span>
                <Input
                  aria-label={`Langkah pengujian ${index + 1}`}
                  value={step}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                  placeholder={`Langkah ${index + 1}`}
                  className="flex-1"
                />
                {steps.length > 1 && (
                  <IconButton
                    label={`Hapus langkah ${index + 1}`}
                    variant="danger"
                    onClick={() => handleRemoveStep(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Expected Result & Test Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea
            id="test-case-expected-result"
            label="Hasil yang Diharapkan"
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            placeholder="Contoh: Pesan berhasil tampil bersama ID pesanan"
            rows={2}
          />

          <Textarea
            id="test-case-data"
            label="Data Pengujian"
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            placeholder="Contoh: Kartu 4242-4242-4242-4242, CVV 123"
            rows={2}
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-200 pt-5 dark:border-stone-800">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          <span className="font-semibold text-stone-700 dark:text-stone-300">Panduan:</span> Simpan
          Draf untuk pengerjaan internal QA. Ajukan untuk Review agar Product Owner dapat
          mengaktifkannya untuk eksekusi.
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Batal
          </Button>

          {/* Save as Draft */}
          <Button
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            leftIcon={<FileCheck className="w-4 h-4" />}
            title="Draf hanya dapat dilihat oleh Anda dan belum siap diuji"
          >
            Simpan Draf
          </Button>

          {/* Activation applies only to an existing QA review submission. New cases always start as drafts. */}
          {isPoOrAdmin && isEditing && initialTestCase?.status === 'in_review' ? (
            <Button
              variant="primary"
              onClick={() => handleSubmit('active')}
              disabled={loading}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Aktifkan
            </Button>
          ) : (
            /* Request Review */
            <Button
              variant="primary"
              onClick={() => handleSubmit('in_review')}
              disabled={loading}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Ajukan untuk Review
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
