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
  if (role === 'owner' || role === 'admin' || role === 'po' || role === 'qa') return;
  throw new Error(
    'FORBIDDEN: Only QA, Product Owner, Admin, or Owner members can create Test Cases.',
  );
}

const lifecycleTransitions: Record<
  'draft' | 'in_review' | 'active' | 'archived',
  readonly ('draft' | 'in_review' | 'active' | 'archived')[]
> = {
  draft: ['in_review'],
  in_review: ['active'],
  active: ['archived'],
  archived: [],
};

export function assertCanUpdateTestCase(
  role: WorkspaceRole,
  currentStatus: 'draft' | 'in_review' | 'active' | 'archived',
  requestedStatus?: 'draft' | 'in_review' | 'active' | 'archived',
): void {
  if (role === 'owner' || role === 'admin' || role === 'po') {
    if (!requestedStatus || requestedStatus === currentStatus) return;
    if (lifecycleTransitions[currentStatus].includes(requestedStatus)) return;
    throw new Error(
      `BAD_REQUEST: Invalid Test Case lifecycle transition from ${currentStatus} to ${requestedStatus}.`,
    );
  }
  if (
    role === 'qa' &&
    currentStatus === 'draft' &&
    (!requestedStatus || ['draft', 'in_review'].includes(requestedStatus))
  )
    return;
  throw new Error(
    'FORBIDDEN: QA can edit only draft Test Cases and may submit them for review; only Product Owner, Admin, or Owner can publish or archive.',
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
  if (role === 'owner' || role === 'admin' || role === 'qa') return;
  throw new Error('FORBIDDEN: Only QA Engineer, Admin, or Owner members can execute Test Runs.');
}

export function assertCanAddTestResultEvidence(role: WorkspaceRole): void {
  if (role === 'owner' || role === 'admin' || role === 'qa') return;
  throw new Error(
    'FORBIDDEN: Only QA Engineer, Admin, or Owner members can add Test Result evidence.',
  );
}
