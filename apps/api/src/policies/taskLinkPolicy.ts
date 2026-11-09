import type { WorkspaceRole } from '@qlick/contracts';
import { isPlanner } from './shared.js';

export class TaskLinkAuthorizationError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'TaskLinkAuthorizationError';
  }
}

export function assertCanReadTaskLinks(role?: WorkspaceRole | null): void {
  if (!role) {
    throw new TaskLinkAuthorizationError(
      'FORBIDDEN: Anda harus menjadi anggota workspace untuk melihat tautan referensi.',
    );
  }
}

export function assertCanManageTaskLinks(role?: WorkspaceRole | null): void {
  if (!role || !isPlanner(role)) {
    throw new TaskLinkAuthorizationError(
      'FORBIDDEN: Hanya Owner, Admin, atau Product Owner yang dapat mengelola tautan referensi Feature.',
    );
  }
}
