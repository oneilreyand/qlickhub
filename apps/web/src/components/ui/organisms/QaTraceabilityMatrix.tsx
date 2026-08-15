import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  RefreshCw,
  Layers,
} from 'lucide-react';
import {
  WorkspaceTraceabilitySummary,
  TestCaseStatus,
} from '@qa/contracts';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Skeleton } from '../atoms/Skeleton';
import { TaskStatusBadge } from '../molecules/TaskStatusBadge';
import { traceabilityService } from '../../../lib/api/traceabilityService';
import { useAppDispatch } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';

interface QaTraceabilityMatrixProps {
  workspaceId: string;
}

export const QaTraceabilityMatrix: React.FC<QaTraceabilityMatrixProps> = ({ workspaceId }) => {
  const dispatch = useAppDispatch();
  const [summary, setSummary] = useState<WorkspaceTraceabilitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Test Case Modal / Inline State
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [newTcTitle, setNewTcTitle] = useState('');
  const [newTcType, setNewTcType] = useState<'manual' | 'e2e' | 'unit' | 'integration'>('manual');
  const [isSubmittingTc, setIsSubmittingTc] = useState(false);

  const loadMatrix = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await traceabilityService.getTraceabilitySummary(workspaceId);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load traceability matrix');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [workspaceId]);

  const handleUpdateStatus = async (testCaseId: string, newStatus: TestCaseStatus) => {
    try {
      await traceabilityService.updateTestCaseStatus(workspaceId, testCaseId, newStatus);
      dispatch(enqueueSnackbar(`Test case status updated to ${newStatus}`, 'success'));
      loadMatrix();
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Failed to update test case status',
          'error'
        )
      );
    }
  };

  const handleAddTestCase = async (requirementId: string) => {
    if (!newTcTitle.trim()) return;
    setIsSubmittingTc(true);
    try {
      await traceabilityService.createRequirementTestCase(workspaceId, requirementId, {
        title: newTcTitle.trim(),
        testType: newTcType,
        status: 'pending',
      });
      dispatch(enqueueSnackbar('Requirement test case created!', 'success'));
      setNewTcTitle('');
      setSelectedReqId(null);
      loadMatrix();
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Failed to create test case',
          'error'
        )
      );
    } finally {
      setIsSubmittingTc(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Traceability Error</h3>
        <p className="text-xs text-stone-500">{error}</p>
        <Button size="sm" variant="outline" onClick={loadMatrix}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Requirements</p>
          <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {summary.totalRequirements}
          </p>
          <p className="text-[11px] text-stone-400 mt-0.5">Across active workspace</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Covered Requirements
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.coveredRequirements}
          </p>
          <p className="text-[11px] text-stone-400 mt-0.5">Linked to tasks/tests</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Uncovered Gaps
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {summary.uncoveredRequirements}
          </p>
          <p className="text-[11px] text-stone-400 mt-0.5">Needs QA coverage</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Test Cases</p>
          <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {summary.totalTestCases}
          </p>
          <p className="text-[11px] text-stone-400 mt-0.5">Validation scenarios</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            QA Pass Rate
          </p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {summary.passRatePercent}%
          </p>
          <p className="text-[11px] text-stone-400 mt-0.5">Passed test ratio</p>
        </Card>
      </div>

      {/* Traceability Matrix Table */}
      <Card className="p-5 space-y-4 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              Requirements Traceability Matrix
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Trace requirements to linked tasks, QA strategy documents, and test case execution statuses.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={loadMatrix} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh Matrix
          </Button>
        </div>

        {summary.matrix.length === 0 ? (
          <p className="text-xs text-stone-500 italic text-center py-8">
            No requirements defined in this workspace yet. Create requirements in Work Hub task drawer to populate the traceability matrix.
          </p>
        ) : (
          <div className="space-y-4">
            {summary.matrix.map((node) => (
              <div
                key={node.requirement.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 dark:border-stone-800 dark:bg-stone-950/40"
              >
                {/* Requirement Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-3 dark:border-stone-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2.5 py-1 text-xs font-black rounded bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shrink-0">
                      {node.requirement.code}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                      {node.requirement.title}
                    </h3>
                  </div>

                  {/* Coverage Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {node.coverageStatus === 'full_coverage' && (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                        ✅ Full Coverage
                      </span>
                    )}
                    {node.coverageStatus === 'partial_coverage' && (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                        ⚡ Partial Coverage
                      </span>
                    )}
                    {node.coverageStatus === 'no_coverage' && (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                        ⚠️ No Coverage
                      </span>
                    )}
                    {node.coverageStatus === 'failing' && (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                        ❌ Failing Tests ({node.totalFailedTests})
                      </span>
                    )}
                  </div>
                </div>

                {/* 3 Columns: Linked Tasks | QA Docs | Test Cases */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  {/* Column 1: Linked Tasks */}
                  <div className="space-y-2 p-3 rounded-lg bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800">
                    <span className="font-bold text-stone-700 dark:text-stone-300 block border-b border-stone-100 pb-1.5 dark:border-stone-800 flex items-center justify-between">
                      <span>Linked Tasks ({node.tasks.length})</span>
                    </span>
                    {node.tasks.length === 0 ? (
                      <p className="text-stone-400 italic text-[11px] py-1">No tasks linked</p>
                    ) : (
                      <div className="space-y-1.5">
                        {node.tasks.map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate flex-1">
                              {t.title}
                            </span>
                            <TaskStatusBadge state={t.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 2: QA Strategy & Docs */}
                  <div className="space-y-2 p-3 rounded-lg bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800">
                    <span className="font-bold text-stone-700 dark:text-stone-300 block border-b border-stone-100 pb-1.5 dark:border-stone-800 flex items-center justify-between">
                      <span>QA Documents ({node.qaDocuments.length})</span>
                    </span>
                    {node.qaDocuments.length === 0 ? (
                      <p className="text-stone-400 italic text-[11px] py-1">No QA docs linked</p>
                    ) : (
                      <div className="space-y-1.5">
                        {node.qaDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate flex-1">
                              {doc.title}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                              v{doc.currentVersion}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Test Cases */}
                  <div className="space-y-2 p-3 rounded-lg bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 dark:border-stone-800">
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        Test Cases ({node.testCases.length})
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[11px]"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => setSelectedReqId(selectedReqId === node.requirement.id ? null : node.requirement.id)}
                      >
                        Add Test
                      </Button>
                    </div>

                    {/* Inline Add Test Case Form */}
                    {selectedReqId === node.requirement.id && (
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 dark:bg-stone-950 dark:border-stone-800 space-y-2 my-2">
                        <Input
                          type="text"
                          placeholder="Test case scenario..."
                          value={newTcTitle}
                          onChange={(e) => setNewTcTitle(e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={newTcType}
                            onChange={(e) => setNewTcType(e.target.value as any)}
                            className="w-full rounded-lg border border-stone-200 bg-white p-1 text-xs dark:border-stone-800 dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                          >
                            <option value="manual">Manual</option>
                            <option value="e2e">E2E Automated</option>
                            <option value="integration">Integration</option>
                            <option value="unit">Unit Test</option>
                          </select>
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={isSubmittingTc}
                            disabled={!newTcTitle.trim()}
                            onClick={() => handleAddTestCase(node.requirement.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    )}

                    {node.testCases.length === 0 ? (
                      <p className="text-stone-400 italic text-[11px] py-1">No test cases executed</p>
                    ) : (
                      <div className="space-y-2">
                        {node.testCases.map((tc) => (
                          <div key={tc.id} className="p-2 rounded bg-stone-50 border border-stone-100 dark:bg-stone-950 dark:border-stone-800 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-stone-900 dark:text-stone-100 flex-1 truncate">
                                {tc.title}
                              </span>
                              <select
                                value={tc.status}
                                onChange={(e) => handleUpdateStatus(tc.id, e.target.value as TestCaseStatus)}
                                className={`text-[10px] font-bold rounded px-1.5 py-0.5 border ${
                                  tc.status === 'passed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                    : tc.status === 'failed'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="passed">Passed</option>
                                <option value="failed">Failed</option>
                                <option value="skipped">Skipped</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
