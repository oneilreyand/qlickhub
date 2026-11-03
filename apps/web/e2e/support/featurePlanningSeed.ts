import bcrypt from 'bcryptjs';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
} from '../../../api/src/db/models/index.js';
import { featureSpecService } from '../../../api/src/modules/featureSpecs/featureSpecService.js';
import { featureSpecFixture } from '../../src/test/featureSpecFixture';

/** Disposable PostgreSQL test factory; browser mutations still go through authenticated APIs. */
export async function seedFeaturePlanning() {
  const stamp = `${Date.now()}-${process.pid}`;
  const password = 'PlanningE2e123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const [po, dev, qa] = await Promise.all(
    (['po', 'dev', 'qa'] as const).map((role) =>
      UserModel.create({
        email: `planning-${role}-${stamp}@example.test`,
        name: `Planning ${role}`,
        role,
        passwordHash,
        onboardingCompletedAt: new Date(),
      }),
    ),
  );
  const workspace = await WorkspaceModel.create({
    name: `Planning fixture ${stamp}`,
    slug: `planning-${stamp}`,
    ownerId: po.id,
  });
  await WorkspaceMemberModel.bulkCreate([
    { workspaceId: workspace.id, userId: po.id, role: 'po' },
    { workspaceId: workspace.id, userId: dev.id, role: 'dev' },
    { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
  ]);
  const member = await WorkspaceMemberModel.findOne({
    where: { workspaceId: workspace.id, userId: dev.id },
  });
  if (!member) throw new Error('Planning fixture member was not persisted');
  await WorkspaceMemberSpecialtyModel.create({
    workspaceId: workspace.id,
    workspaceMemberId: member.id,
    specialty: 'backend',
    createdBy: po.id,
  });
  const spec = await featureSpecService.create(po.id, {
    workspaceId: workspace.id,
    title: 'Planning browser fixture',
    idea: 'Checkout melalui satu halaman.',
  });
  let preview = await featureSpecService.create(po.id, {
    workspaceId: workspace.id,
    title: 'Planning responsive fixture',
    idea: 'Periksa tampilan draf.',
  });
  const source = featureSpecFixture();
  preview = await featureSpecService.saveSection(po.id, {
    workspaceId: workspace.id,
    specId: preview.id,
    version: preview.version,
    section: 'plan',
    content: source.plan,
    complete: true,
  });
  preview = await featureSpecService.saveSection(po.id, {
    workspaceId: workspace.id,
    specId: preview.id,
    version: preview.version,
    section: 'prd',
    content: source.prd,
    complete: false,
  });
  let taskPreview = await featureSpecService.create(po.id, {
    workspaceId: workspace.id,
    title: 'Task responsive fixture',
    idea: 'Periksa subtask dan konfirmasi Apply.',
  });
  for (const section of ['plan', 'prd'] as const)
    taskPreview = await featureSpecService.saveSection(po.id, {
      workspaceId: workspace.id,
      specId: taskPreview.id,
      version: taskPreview.version,
      section,
      content: source[section],
      complete: true,
    });
  taskPreview = await featureSpecService.saveSection(po.id, {
    workspaceId: workspace.id,
    specId: taskPreview.id,
    version: taskPreview.version,
    section: 'tasks',
    content: { subtasks: source.tasks.subtasks!.map((row) => ({ ...row, assigneeId: dev.id })) },
    complete: false,
  });
  return { workspace, po, dev, qa, password, spec, preview, taskPreview };
}
