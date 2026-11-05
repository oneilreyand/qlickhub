import bcrypt from 'bcryptjs';
import {
  UserModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  WorkspaceModel,
} from '../../../api/src/db/models/index.js';

export const flowPassword = 'SdlcFlowE2e123!';

/**
 * E2E-SDLC-FLOW P5: only accounts and the Workspace are seeded; everything else is created through
 * the UI. The QA account's global role is deliberately `dev` while its Workspace role is `qa`
 * (ADR-041 / P1: the web app must follow the Workspace role).
 */
export async function seedSdlcFlow() {
  const stamp = `${Date.now()}-${process.pid}`;
  const passwordHash = await bcrypt.hash(flowPassword, 10);
  const make = (key: string, name: string, globalRole: 'po' | 'dev' | 'qa') =>
    UserModel.create({
      email: `flow-${key}-${stamp}@example.test`,
      name,
      role: globalRole,
      passwordHash,
      onboardingCompletedAt: new Date(),
    });
  const po = await make('po', 'Flow PO', 'po');
  const devBe = await make('dev-be', 'Flow Dev BE', 'dev');
  const devFe = await make('dev-fe', 'Flow Dev FE', 'dev');
  const qa = await make('qa', 'Flow QA', 'dev');
  const workspace = await WorkspaceModel.create({
    name: `SDLC flow ${stamp}`,
    slug: `sdlc-flow-${stamp}`,
    ownerId: po.id,
  });
  const members = await WorkspaceMemberModel.bulkCreate(
    [
      { workspaceId: workspace.id, userId: po.id, role: 'po' },
      { workspaceId: workspace.id, userId: devBe.id, role: 'dev' },
      { workspaceId: workspace.id, userId: devFe.id, role: 'dev' },
      { workspaceId: workspace.id, userId: qa.id, role: 'qa' },
    ],
    { returning: true },
  );
  const specialties: Array<[string, string]> = [
    [devBe.id, 'backend'],
    [devFe.id, 'frontend'],
  ];
  for (const [userId, specialty] of specialties) {
    const member = members.find((row) => row.userId === userId)!;
    await WorkspaceMemberSpecialtyModel.create({
      workspaceId: workspace.id,
      workspaceMemberId: member.id,
      specialty,
      createdBy: po.id,
    } as never);
  }
  return { workspace, po, devBe, devFe, qa };
}
