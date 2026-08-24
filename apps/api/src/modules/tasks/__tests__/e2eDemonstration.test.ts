import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkFolderModel,
  TaskModel,
} from '../../../db/models/index.js';
import { taskService } from '../taskService.js';
import { CreateTaskSchema } from '@qlick/contracts';

describe('LIVE E2E DEMONSTRATION SCENARIO (1 PO, 1 DEV, 1 QA)', () => {
  let poUser: UserModel;
  let devUser: UserModel;
  let qaUser: UserModel;
  let workspace: WorkspaceModel;
  let folder: WorkFolderModel;
  let parentTask: TaskModel;
  let subtaskFE: TaskModel;
  let subtaskQA: TaskModel;

  before(async () => {
    console.log('\n========================================================================');
    console.log('🚀 STARTING LIVE E2E SCENARIO EXECUTION ON REAL POSTGRESQL DATABASE');
    console.log('========================================================================\n');

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. SETUP USERS: 1 PO, 1 DEV, 1 QA
    console.log('👤 [Step 1] Menyiapkan Akun Pengguna:');
    poUser = await UserModel.create({
      id: uuidv4(),
      email: `rian.po.${Date.now()}@example.com`,
      name: 'Rian Pratama (Product Owner)',
      role: 'po',
      passwordHash,
    });
    console.log(`   ✅ 1. PO  : ${poUser.name} (${poUser.email})`);

    devUser = await UserModel.create({
      id: uuidv4(),
      email: `budi.dev.${Date.now()}@example.com`,
      name: 'Budi Setiawan (Frontend Dev)',
      role: 'dev',
      passwordHash,
    });
    console.log(`   ✅ 2. Dev : ${devUser.name} (${devUser.email})`);

    qaUser = await UserModel.create({
      id: uuidv4(),
      email: `doni.qa.${Date.now()}@example.com`,
      name: 'Doni Wijaya (QA Engineer)',
      role: 'qa',
      passwordHash,
    });
    console.log(`   ✅ 3. QA  : ${qaUser.name} (${qaUser.email})`);

    // 2. SETUP WORKSPACE & MEMBERSHIP
    console.log('\n🏢 [Step 2] Membuat Workspace & Menetapkan Role:');
    workspace = await WorkspaceModel.create({
      id: uuidv4(),
      name: 'E2E Payment System Workspace',
      slug: `e2e-ws-${Date.now()}`,
      ownerId: poUser.id,
    });

    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: poUser.id,
      role: 'owner',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspace.id,
      userId: devUser.id,
      role: 'dev',
    });
    await WorkspaceMemberModel.create({ workspaceId: workspace.id, userId: qaUser.id, role: 'qa' });
    console.log(`   ✅ Workspace dibuat: "${workspace.name}" (ID: ${workspace.id})`);
  });

  after(async () => {
    await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });
    await WorkspaceModel.destroy({ where: { id: workspace.id }, force: true });
    await UserModel.destroy({ where: { id: poUser.id }, force: true });
    await UserModel.destroy({ where: { id: devUser.id }, force: true });
    await UserModel.destroy({ where: { id: qaUser.id }, force: true });
  });

  test('E2E Step 3: PO merencanakan Folder, Parent Task, dan Subtasks di Task Hub', async () => {
    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Sprint 1 - Pembayaran',
      position: 0,
      createdBy: poUser.id,
    });
    console.log(`\n📁 [Step 3] PO (Rian) Merencanakan Fitur di Task Hub:`);
    console.log(`   ✅ Folder: "${folder.name}"`);

    const parent = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        title: 'Integrasi Pembayaran QRIS Dinamis',
        status: 'in_progress',
        priority: 'urgent',
      }),
    );
    parentTask = (await TaskModel.findByPk(parent.id))!;
    console.log(
      `   ✅ Parent Task: "${parentTask.title}" (ID: ${parentTask.id}, Status: ${parentTask.status})`,
    );

    const fe = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'frontend',
        title: 'Slicing & Form QRIS View',
        assigneeId: devUser.id,
        status: 'todo',
      }),
    );
    subtaskFE = (await TaskModel.findByPk(fe.id))!;
    console.log(`   ✅ Subtask FE: "${subtaskFE.title}" -> Assignee: Budi (Dev)`);

    const qa = await taskService.createTask(
      poUser.id,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        parentTaskId: parentTask.id,
        deliveryArea: 'qa',
        title: 'E2E Automation Test QRIS',
        assigneeId: qaUser.id,
        status: 'todo',
      }),
    );
    subtaskQA = (await TaskModel.findByPk(qa.id))!;
    console.log(`   ✅ Subtask QA: "${subtaskQA.title}" -> Assignee: Doni (QA)`);
  });

  test('E2E Step 4: Dev (Budi) memperbarui progress subtask (TODO -> IN_PROGRESS)', async () => {
    console.log(`\n👨‍💻 [Step 4] Dev (Budi) memulai pengerjaan subtask:`);
    const inProg = await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
      status: 'in_progress',
    });
    console.log(`   ✅ Dev update subtask: TODO -> ${inProg.status.toUpperCase()}`);
    assert.strictEqual(inProg.status, 'in_progress');
  });

  test('E2E Step 5: Dev menyerahkan subtask ke IN_REVIEW untuk QA', async () => {
    console.log(`\n⛔ [Step 5] Dev menyerahkan subtask ke IN_REVIEW:`);
    const inRev = await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
      status: 'in_review',
    });
    assert.strictEqual(inRev.status, 'in_review');
  });

  test('E2E Step 6: QA merequest changes dengan review notes', async () => {
    console.log(`\n🕵️ [Step 6] QA Melakukan Review & Request Changes:`);
    const note =
      'Error modal QRIS tidak muncul saat koneksi timeout. Mohon tambahkan error boundary & retry button.';
    const req = await taskService.updateTask(qaUser.id, workspace.id, subtaskFE.id, {
      status: 'changes_requested',
      reviewNotes: note,
    });
    console.log(`   ✅ QA mengubah status: IN_REVIEW -> ${req.status.toUpperCase()}`);
    console.log(`   📝 Catatan Review: "${req.reviewNotes}"`);
    assert.strictEqual(req.status, 'changes_requested');
    assert.strictEqual(req.reviewNotes, note);
    assert.strictEqual(req.reviewedBy, qaUser.id);
  });

  test('E2E Step 7: Dev memperbaiki dan resubmit subtask setelah review notes', async () => {
    console.log(`\n👨‍💻 [Step 7] Dev Memperbarui Subtask setelah review notes:`);
    const rework = await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
      status: 'in_progress',
      description: 'Menambahkan Error Modal & Retry logic saat timeout.',
    });
    console.log(`   ✅ Dev update: CHANGES_REQUESTED -> ${rework.status.toUpperCase()}`);

    const resubmit = await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
      status: 'in_review',
    });
    console.log(`   ✅ Dev update: IN_PROGRESS -> ${resubmit.status.toUpperCase()}`);
    assert.strictEqual(resubmit.status, 'in_review');
  });

  test('E2E Step 8: Uji Coba Ketergantungan QA terhadap FE (Subtask QA terkunci sampai FE selesai)', async () => {
    console.log(`\n🕵️ [Step 8] Uji Coba Ketergantungan Subtask QA (P2 Gate):`);
    // PO mencoba menyelesaikan subtask QA saat subtask FE masih in_review -> HARUS DITOLAK
    await assert.rejects(
      async () => {
        await taskService.updateTask(poUser.id, workspace.id, subtaskQA.id, { status: 'done' });
      },
      (err: any) => {
        console.log(`   🛡️ DITOLAK OLEH SISTEM: "${err.message}"`);
        assert.ok(
          String(err.message).includes(
            'Cannot mark QA subtask as Done until all development subtasks are completed',
          ),
        );
        return true;
      },
    );

    // QA menyetujui subtask FE
    const appFE = await taskService.updateTask(qaUser.id, workspace.id, subtaskFE.id, {
      status: 'done',
    });
    console.log(`   ✅ QA approve Subtask FE: IN_REVIEW -> ${appFE.status.toUpperCase()}`);
    assert.strictEqual(appFE.status, 'done');
    assert.strictEqual(appFE.reviewedBy, qaUser.id);

    // Sekarang QA menjalankan lifecycle eksekusi yang valid sebelum menyelesaikan subtask.
    const startedQA = await taskService.updateTask(qaUser.id, workspace.id, subtaskQA.id, {
      status: 'in_progress',
    });
    assert.strictEqual(startedQA.status, 'in_progress');

    const appQA = await taskService.updateTask(qaUser.id, workspace.id, subtaskQA.id, {
      status: 'done',
    });
    console.log(`   ✅ Subtask QA berhasil diverifikasi: ${appQA.status.toUpperCase()}`);
    assert.strictEqual(appQA.status, 'done');
  });

  test('E2E Step 9: Penutupan Parent Task oleh PO di Task Hub', async () => {
    console.log(`\n🏁 [Step 9] PO (Rian) Menyelesaikan Parent Task di Task Hub:`);
    const completedParent = await taskService.completeTask(poUser.id, workspace.id, parentTask.id, {
      status: 'done',
    });
    console.log(
      `   ✅ Parent Task "${completedParent.title}" -> STATUS: ${completedParent.status.toUpperCase()}`,
    );
    console.log(`   ⏱️ Completed At: ${completedParent.completedAt}`);
    assert.strictEqual(completedParent.status, 'done');
    assert.ok(completedParent.completedAt);

    console.log('\n========================================================================');
    console.log('🎉 E2E LIVE SCENARIO BERHASIL 100% — SELURUH QUALITY GATES & RBAC VALID!');
    console.log('========================================================================\n');
  });
});
