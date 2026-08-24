import type { TestCaseDefinitionStatus, WorkspaceRole } from '@qlick/contracts';

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

export function assertCanCreateTestCase(
  role: WorkspaceRole,
  status: TestCaseDefinitionStatus = 'draft',
): void {
  if (role === 'owner' || role === 'admin' || role === 'po') return;
  if (role === 'qa') {
    if (status === 'draft' || status === 'in_review') return;
    throw new Error(
      'FORBIDDEN: QA can only create draft or in-review Test Cases. Only PO, Admin, or Owner can publish.',
    );
  }
  throw new Error(
    'FORBIDDEN: Only QA, Product Owner, Admin, or Owner members can create Test Cases.',
  );
}

export function assertCanUpdateTestCase(
  role: WorkspaceRole,
  currentStatus: TestCaseDefinitionStatus,
  nextStatus?: TestCaseDefinitionStatus,
): void {
  if (role === 'owner' || role === 'admin' || role === 'po') return;
  if (role === 'qa') {
    if (nextStatus === 'active' || nextStatus === 'archived') {
      throw new Error(
        'FORBIDDEN: Only Product Owner, Admin, or Owner members can publish or archive Test Cases.',
      );
    }
    if (currentStatus === 'draft' || currentStatus === 'in_review') return;
    throw new Error('FORBIDDEN: QA cannot edit published active or archived Test Cases.');
  }
  throw new Error(
    'FORBIDDEN: Only QA, Product Owner, Admin, or Owner members can update Test Cases.',
  );
}

export function assertCanImportTestCases(role: WorkspaceRole): void {
  if (role === 'owner' || role === 'admin' || role === 'po' || role === 'qa') return;
  throw new Error(
    'FORBIDDEN: You do not have permission to import Test Cases into this workspace.',
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
