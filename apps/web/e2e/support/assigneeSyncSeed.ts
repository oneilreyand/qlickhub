import bcrypt from 'bcryptjs';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
} from '../../../api/src/db/models/index.js';

/** Disposable PostgreSQL test factory: one PO and two backend Developers in one Workspace. */
export async function seedAssigneeSync() {
  const stamp = `${Date.now()}-${process.pid}`;
  const password = 'AssigneeE2e123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const create = (key: string, role: 'po' | 'dev', name: string) =>
    UserModel.create({
      email: `assignee-${key}-${stamp}@example.test`,
      name,
      role,
      passwordHash,
      onboardingCompletedAt: new Date(),
    });
  const po = await create('po', 'po', 'Pemilik Produk');
  const first = await create('dev-a', 'dev', 'Andi Backend');
  const second = await create('dev-b', 'dev', 'Budi Backend');
  const workspace = await WorkspaceModel.create({
    name: `Assignee fixture ${stamp}`,
    slug: `assignee-${stamp}`,
    ownerId: po.id,
  });
  await WorkspaceMemberModel.bulkCreate([
    { workspaceId: workspace.id, userId: po.id, role: 'po' },
    { workspaceId: workspace.id, userId: first.id, role: 'dev' },
    { workspaceId: workspace.id, userId: second.id, role: 'dev' },
  ]);
  for (const developer of [first, second]) {
    const member = await WorkspaceMemberModel.findOne({
      where: { workspaceId: workspace.id, userId: developer.id },
    });
    if (!member) throw new Error('Assignee fixture member was not persisted');
    await WorkspaceMemberSpecialtyModel.create({
      workspaceId: workspace.id,
      workspaceMemberId: member.id,
      specialty: 'backend',
      createdBy: po.id,
    });
  }
  return { workspace, po, first, second, password };
}
