import React, { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import type { Requirement, Task } from '@qlick/contracts';

import { FeatureReadinessPanel } from '../FeatureReadinessPanel';
import { RequirementFindingPanel } from '../RequirementFindingPanel';
import { RequirementManager, type RequirementManagerInitialState } from '../RequirementManager';

export interface TaskDetailSpecsTabProps {
  task: Task;
  activeWorkspaceId: string | null;
  userRole: string;
  onRequirementChanged: () => void;
  onPlanSubtask?: (requirement: Requirement) => void;
  requirementInitialState?: RequirementManagerInitialState;
}

export const TaskDetailSpecsTab: React.FC<TaskDetailSpecsTabProps> = ({
  task,
  activeWorkspaceId,
  userRole,
  onRequirementChanged,
  onPlanSubtask,
  requirementInitialState,
}) => {
  const [isGovernanceExpanded, setIsGovernanceExpanded] = useState(false);

  return (
    <div className="space-y-5">
      {/* 1. Primary Work Area: Requirement & Acceptance Criteria Manager */}
      <RequirementManager
        workspaceId={activeWorkspaceId || task.workspaceId}
        taskId={task.id}
        userRole={(userRole || 'dev') as any}
        onRequirementChanged={onRequirementChanged}
        onPlanSubtask={onPlanSubtask}
        initialState={requirementInitialState}
      />

      {/* 2. Secondary Governance & Assurance Section (Only for root tasks) */}
      {!task.parentTaskId && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900/90 shadow-xs">
          <button
            type="button"
            onClick={() => setIsGovernanceExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between text-left group"
            aria-expanded={isGovernanceExpanded}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-[#B1E743]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-stone-700 dark:group-hover:text-stone-200">
                  Kesiapan Fitur &amp; Review Mutu
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Pemeriksaan baseline, persetujuan Dev &amp; QA, serta pencatatan temuan
                  spesifikasi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                {isGovernanceExpanded ? 'Sembunyikan' : 'Buka Detail'}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${
                  isGovernanceExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {isGovernanceExpanded && (
            <div className="mt-5 space-y-5 border-t border-stone-100 pt-5 dark:border-stone-800">
              <FeatureReadinessPanel
                workspaceId={activeWorkspaceId || task.workspaceId}
                featureTaskId={task.id}
                onDataChanged={onRequirementChanged}
              />
              <RequirementFindingPanel
                workspaceId={activeWorkspaceId || task.workspaceId}
                featureTaskId={task.id}
                onDataChanged={onRequirementChanged}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
