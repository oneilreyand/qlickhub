import React from 'react';
import type { QaWorkflowSummary, TaskComment } from '@qlick/contracts';
import type { WorkspaceMemberItem } from '../../../../../../lib/api/workspaceService';

import { SubtaskCommentBox } from '../../../../molecules/SubtaskCommentBox';
import { ReleaseAssurancePanel } from '../../../ReleaseAssurancePanel';

export interface QaSignOffTabProps {
  workspaceId: string;
  featureTaskId: string;
  userRole: string;
  focusTarget?: 'test_cases' | 'qa_sign_off' | null;
  workflowSummary: QaWorkflowSummary | null;
  isLoadingWorkflowSummary: boolean;
  workflowSummaryError: string | null;
  onReloadWorkflowSummary: () => void;
  onDataChanged: () => void;
  comments: TaskComment[];
  currentUserId?: string;
  members: WorkspaceMemberItem[];
  onPostComment: (body: string, parentCommentId?: string | null) => Promise<void>;
}

export const QaSignOffTab: React.FC<QaSignOffTabProps> = ({
  workspaceId,
  featureTaskId,
  userRole,
  focusTarget,
  workflowSummary,
  isLoadingWorkflowSummary,
  workflowSummaryError,
  onReloadWorkflowSummary,
  onDataChanged,
  comments,
  currentUserId,
  members,
  onPostComment,
}) => {
  return (
    <section
      role="tabpanel"
      id="qa-workflow-panel-sign-off"
      aria-label="Persetujuan QA dan riwayat"
      className="space-y-6"
    >
      <ReleaseAssurancePanel
        workspaceId={workspaceId}
        featureTaskId={featureTaskId}
        userRole={userRole}
        mode="qa"
        focusWhenReady={focusTarget === 'qa_sign_off'}
        qaWorkflowSummary={workflowSummary}
        isQaWorkflowSummaryLoading={isLoadingWorkflowSummary}
        qaWorkflowSummaryError={workflowSummaryError}
        onDataChanged={() => {
          onReloadWorkflowSummary();
          onDataChanged();
        }}
      />
      <SubtaskCommentBox
        comments={comments}
        currentUserId={currentUserId}
        members={members}
        onPostComment={onPostComment}
        title="Diskusi Kolaborasi & Masukan QA"
        maxHeight="max-h-[500px]"
      />
    </section>
  );
};
