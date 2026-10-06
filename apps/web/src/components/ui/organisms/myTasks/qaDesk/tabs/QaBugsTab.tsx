import React from 'react';
import { AlertTriangle, Bug } from 'lucide-react';
import type { QaWorkflowSummary } from '@qlick/contracts';

import { Alert } from '../../../../atoms/Alert';
import { Button } from '../../../../atoms/Button';
import { Card } from '../../../../atoms/Card';
import { BugExperiencePanel } from '../../../BugExperiencePanel';
import type { BugTraceOption } from '../types';

export interface QaBugsTabProps {
  canOpenBugReport: boolean;
  onOpenBugModal: () => void;
  bugTraceOptions: BugTraceOption[];
  workflowSummary: QaWorkflowSummary | null;
  workspaceId: string;
  userRole: string;
  featureTaskId: string;
  subtaskId: string;
  onReloadWorkflowSummary: () => void;
  onDataChanged: () => void;
  onRetestRunStarted: (qaSubtaskId: string) => void;
}

export const QaBugsTab: React.FC<QaBugsTabProps> = ({
  canOpenBugReport,
  onOpenBugModal,
  bugTraceOptions,
  workflowSummary,
  workspaceId,
  userRole,
  featureTaskId,
  subtaskId,
  onReloadWorkflowSummary,
  onDataChanged,
  onRetestRunStarted,
}) => {
  return (
    <section
      role="tabpanel"
      id="qa-workflow-panel-bugs"
      aria-label="Bug dan retest"
      className="space-y-4"
    >
      <Card className="space-y-4 border-stone-200/80 p-5 dark:border-stone-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Bug &amp; Retest
              </h3>
            </div>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              Catat Bug dari hasil gagal atau terblokir. Retest dimulai dari konteks Bug pada
              antrean kerja agar Result lama dan bukti siklus sebelumnya tetap terbaca.
            </p>
          </div>
          {canOpenBugReport && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="destructive"
                size="sm"
                onClick={onOpenBugModal}
                disabled={bugTraceOptions.length === 0}
                title={
                  bugTraceOptions.length === 0
                    ? 'Catat hasil pengujian yang gagal atau terblokir terlebih dahulu'
                    : 'Buat Bug tertaut'
                }
                leftIcon={<AlertTriangle className="h-4 w-4" />}
              >
                Catat Bug
              </Button>
              {bugTraceOptions.length === 0 && (
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Belum ada hasil gagal/terblokir
                </span>
              )}
            </div>
          )}
        </div>
        {workflowSummary?.blockers.includes('unverified_bug') ? (
          <Alert tone="warning" title="Retest masih diperlukan">
            Pilih Bug di bawah untuk melihat setiap perbaikan dan memulai retest pada Siklus
            Pengujian yang tepat.
          </Alert>
        ) : (
          <Alert tone="info" title="Tidak ada retest yang menunggu">
            Bug yang sudah memiliki hasil retest tetap dapat dibaca pada riwayat Bug tanpa menambah
            tindakan baru di tahap ini.
          </Alert>
        )}
      </Card>
      <BugExperiencePanel
        workspaceId={workspaceId}
        userRole={userRole}
        mode="feature"
        featureTaskId={featureTaskId}
        onDataChanged={() => {
          onReloadWorkflowSummary();
          onDataChanged();
        }}
        onRetestRunStarted={(qaSubtaskId) => {
          if (qaSubtaskId !== subtaskId) return;
          onRetestRunStarted(qaSubtaskId);
        }}
      />
    </section>
  );
};
