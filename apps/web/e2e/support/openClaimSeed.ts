import bcrypt from 'bcryptjs';
import {
  TaskModel,
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
} from '../../../api/src/db/models/index.js';

/**
 * P5g-2 (ADR-038) disposable PostgreSQL factory: members with persisted specialties, one
 * Feature root, and open/assigned subtasks. Every claim/release in the spec goes through the
 * authenticated UI and API; this seed only prepares the starting rows.
 */
export async function seedOpenClaim() {
  const stamp = `${Date.now()}-${process.pid}`;
  const password = 'OpenClaimE2e123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const create = (key: string, role: 'po' | 'dev' | 'qa') =>
    UserModel.create({
      email: `claim-${key}-${stamp}@example.test`,
      name: `Claim ${key}`,
      role,
      passwordHash,
      onboardingCompletedAt: new Date(),
    });
  const po = await create('po', 'po');
  const devBackend = await create('backend', 'dev');
  const devFullstack = await create('fullstack', 'dev');
  const qa = await create('qa', 'qa');
  const workspace = await WorkspaceModel.create({
    name: `Open claim fixture ${stamp}`,
    slug: `open-claim-${stamp}`,
    ownerId: po.id,
  });
  for (const [user, role, specialty] of [
    [po, 'po', null],
    [devBackend, 'dev', 'backend'],
    [devFullstack, 'dev', 'fullstack'],
    [qa, 'qa', null],
  ] as const) {
    const member = await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: user.id,
      role,
    });
    if (specialty) {
      await WorkspaceMemberSpecialtyModel.create({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        specialty,
        createdBy: po.id,
      });
    }
  }
  const feature = await TaskModel.create({
    workspaceId: workspace.id,
    title: 'Checkout terbuka',
    reporterId: po.id,
    status: 'in_progress',
    priority: 'high',
    startDate: '2026-11-04',
    dueDate: '2026-11-28',
  });
  const subtask = (
    title: string,
    deliveryArea: 'backend' | 'frontend' | 'qa',
    dueDate: string,
    assigneeId: string | null = null,
  ) =>
    TaskModel.create({
      workspaceId: workspace.id,
      parentTaskId: feature.id,
      title,
      description: `${title} untuk fixture P5g-2.`,
      deliveryArea,
      reporterId: po.id,
      status: 'todo',
      priority: 'high',
      assigneeId,
      assignmentMode: assigneeId ? 'assigned' : 'open',
      startDate: '2026-11-04',
      dueDate,
    });
  const backendOpen = await subtask('Webhook pembayaran terbuka', 'backend', '2026-11-10');
  const frontendOpen = await subtask('Form checkout terbuka', 'frontend', '2026-11-12');
  const raceOpen = await subtask('Rekonsiliasi saldo terbuka', 'backend', '2026-11-14');
  const qaOpen = await subtask('QA checkout terbuka', 'qa', '2026-11-16');
  const assigned = await subtask('API refund ditugaskan', 'backend', '2026-11-18', devBackend.id);
  return {
    password,
    po,
    devBackend,
    devFullstack,
    qa,
    workspace,
    feature,
    backendOpen,
    frontendOpen,
    raceOpen,
    qaOpen,
    assigned,
  };
}
