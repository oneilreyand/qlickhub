import type { WorkspaceRole } from '@qlick/contracts';

export function assertCanReadTestManagement(role: WorkspaceRole): void {
  if (role) return;
  throw new Error('FORBIDDEN: You must be a workspace member to view test management.');
}

export function assertCanManageTestCaseDefinition(role: WorkspaceRole): void {
  if (role === 'owner' || role === 'admin' || role === 'po') return;
  throw new Error(
    'FORBIDDEN: Only Product Owner, Admin, or Owner members can manage Test Case definitions.',
  );
}

export function assertCanCreateTestCase(role: WorkspaceRole): void {
  if (role === 'qa') return;
  throw new Error('FORBIDDEN: Only QA Engineer members can create draft Test Cases.');
}

const lifecycleTransitions: Record<
  'draft' | 'in_review' | 'active' | 'archived',
  readonly ('draft' | 'in_review' | 'active' | 'archived')[]
> = {
  draft: ['in_review', 'active'],
  in_review: ['draft', 'active'],
  active: ['draft', 'archived'],
  archived: [],
};

export function assertCanUpdateTestCase(
  role: WorkspaceRole,
  currentStatus: 'draft' | 'in_review' | 'active' | 'archived',
  requestedStatus?: 'draft' | 'in_review' | 'active' | 'archived',
  hasDefinitionChanges = false,
  hasQaActivationScope = false,
): void {
  if (role === 'owner' || role === 'admin' || role === 'po') {
    if (hasDefinitionChanges) {
      throw new Error(
        'FORBIDDEN: Product Owner, Admin, and Owner can review lifecycle status but cannot alter a Test Case definition.',
      );
    }
    if (!requestedStatus || requestedStatus === currentStatus) return;
    if (lifecycleTransitions[currentStatus].includes(requestedStatus)) return;
    throw new Error(
      `BAD_REQUEST: Invalid Test Case lifecycle transition from ${currentStatus} to ${requestedStatus}.`,
    );
  }
  if (
    role === 'qa' &&
    currentStatus === 'draft' &&
    (!requestedStatus ||
      ['draft', 'in_review'].includes(requestedStatus) ||
      (requestedStatus === 'active' && hasQaActivationScope))
  )
    return;
  throw new Error(
    'FORBIDDEN: QA can edit draft Test Cases and may activate them only within the proven scope of their assigned QA Subtask; only Product Owner, Admin, or Owner can request revision or archive.',
  );
}

export function assertCanImportTestCases(
  role: WorkspaceRole,
  mode: 'create_only' | 'update' = 'create_only',
): void {
  if (role === 'owner' || role === 'admin' || role === 'po') return;
  if (role === 'qa' && mode === 'create_only') return;
  throw new Error(
    'FORBIDDEN: QA may import Test Cases as drafts using create-only mode; update import is planner-only.',
  );
}

export function assertCanExecuteTestRun(role: WorkspaceRole): void {
  if (role === 'qa') return;
  throw new Error('FORBIDDEN: Only QA Engineer members can execute Test Runs.');
}

export function assertCanAddTestResultEvidence(role: WorkspaceRole): void {
  if (role === 'qa') return;
  throw new Error('FORBIDDEN: Only QA Engineer members can add Test Result evidence.');
}
