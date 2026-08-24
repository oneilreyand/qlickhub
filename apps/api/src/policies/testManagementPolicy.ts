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
  if (role === 'owner' || role === 'admin' || role === 'po') return;
  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner members can create Test Cases.');
}

export function assertCanUpdateTestCase(role: WorkspaceRole): void {
  if (role === 'owner' || role === 'admin' || role === 'po') return;
  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner members can update Test Cases.');
}

export function assertCanImportTestCases(role: WorkspaceRole): void {
  if (role === 'owner' || role === 'admin' || role === 'po') return;
  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner members can import Test Cases.');
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
