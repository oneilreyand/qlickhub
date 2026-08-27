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
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
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
  const [externalReference, setExternalReference] = useState(
    initialTestCase?.externalReference || '',
  );
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
    setExternalReference(initialTestCase?.externalReference || '');
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
      setErrorMessage('Test Case Title is required.');
      return;
    }
    if (selectedReqIds.length === 0) {
      setErrorMessage('Select at least one Requirement to link this Test Case.');
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
            externalReference: externalReference.trim() || null,
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
          externalReference: externalReference.trim() || null,
          priority,
          status: targetStatus,
          scenarioKind,
          source: 'native',
          testType,
          preconditions: preconditions.trim() || null,
          steps: filteredSteps,
          expectedResult: expectedResult.trim() || null,
          testData: testData.trim() || null,
          requirementIds: selectedReqIds,
        });
        onSuccess(created);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save Test Case.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Test Case' : 'Author Native Test Case'}
      description="Create canonical test cases linked to requirements with full lifecycle support."
      size="3xl"
    >
      <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Basic fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Verify returning customer card checkout"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Test Case ID (External Ref)
            </label>
            <Input
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
              placeholder="e.g. TC-001"
            />
          </div>
        </div>

        {/* Metadata Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TestCasePriority)}
              className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Scenario Kind
            </label>
            <select
              value={scenarioKind}
              onChange={(e) => setScenarioKind(e.target.value as TestCaseScenarioKind)}
              className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="positive">Positive (Happy Path)</option>
              <option value="negative">Negative (Edge / Error)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Test Type
            </label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as CanonicalTestCaseType)}
              className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="manual">Manual</option>
              <option value="e2e">E2E</option>
              <option value="integration">Integration</option>
              <option value="unit">Unit</option>
            </select>
          </div>
        </div>

        {/* Linked Requirements */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Linked Requirements <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-800/60 rounded-xl border border-slate-700">
            {requirements.map((req) => {
              const isSelected = selectedReqIds.includes(req.id);
              return (
                <button
                  type="button"
                  key={req.id}
                  onClick={() => toggleRequirement(req.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-primary/20 border border-primary text-primary font-semibold'
                      : 'bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-mono">{req.code}</span>
                  <span className="truncate max-w-[150px]">{req.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preconditions */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Preconditions
          </label>
          <Textarea
            value={preconditions}
            onChange={(e) => setPreconditions(e.target.value)}
            placeholder="e.g. User has valid authentication session and items in cart"
            rows={2}
          />
        </div>

        {/* Steps List Builder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Step-by-Step Instructions
            </label>
            <button
              type="button"
              onClick={handleAddStep}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Step
            </button>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 w-6 text-right flex-shrink-0">
                  {index + 1}.
                </span>
                <Input
                  value={step}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                  className="flex-1"
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Remove step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Expected Result & Test Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Expected Result
            </label>
            <Textarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="e.g. Success modal displayed with order ID"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Test Data
            </label>
            <Textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              placeholder="e.g. Card: 4242-4242-4242-4242, CVV: 123"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-4 border-t border-slate-800">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save as Draft */}
          <Button
            variant="secondary"
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            leftIcon={<FileCheck className="w-4 h-4" />}
          >
            Save Draft
          </Button>

          {/* Request Review */}
          <Button
            variant="outline"
            onClick={() => handleSubmit('in_review')}
            disabled={loading}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Submit for Review
          </Button>

          {/* Publish Active (PO/Admin/Owner only - D1) */}
          {isPoOrAdmin && (
            <Button
              variant="primary"
              onClick={() => handleSubmit('active')}
              disabled={loading}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Publish Active
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
