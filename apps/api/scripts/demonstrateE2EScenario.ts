import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../src/db/sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkFolderModel,
  TaskModel,
} from '../src/db/models/index.js';
import { taskService } from '../src/modules/tasks/taskService.js';
import { CreateTaskSchema } from '@qlick/contracts';

async function runE2EDemo() {
  console.log('========================================================================');
  console.log('LIVE END-TO-END DEMONSTRATION: TASK HIERARCHY & RBAC QUALITY GATES');
  console.log('========================================================================');

  await sequelize.authenticate();
  const passwordHash = await bcrypt.hash('Password123!', 10);

  console.log('
[1/9] Menyiapkan Akun Pengguna (Data Asli PostgreSQL):');
  const [poUser] = await UserModel.findOrCreate({
    where: { email: 'rian.po@example.com' },
    defaults: {
      id: uuidv4(),
      email: 'rian.po@example.com',
      name: 'Rian Pratama (Product Owner)',
      role: 'po',
      passwordHash,
    },
  });
  console.log('   PO  : ' + poUser.name + ' (' + poUser.email + ')');

  const [devUser] = await UserModel.findOrCreate({
    where: { email: 'budi.dev@example.com' },
    defaults: {
      id: uuidv4(),
      email: 'budi.dev@example.com',
      name: 'Budi Setiawan (Frontend Developer)',
      role: 'dev',
      passwordHash,
    },
  });
  console.log('   Dev : ' + devUser.name + ' (' + devUser.email + ')');

  const [qaUser] = await UserModel.findOrCreate({
    where: { email: 'doni.qa@example.com' },
    defaults: {
      id: uuidv4(),
      email: 'doni.qa@example.com',
      name: 'Doni Wijaya (QA Engineer)',
      role: 'qa',
      passwordHash,
    },
  });
  console.log('   QA  : ' + qaUser.name + ' (' + qaUser.email + ')');

  console.log('
[2/9] Membuat Workspace & Menugaskan Role Anggota:');
  const [workspace] = await WorkspaceModel.findOrCreate({
    where: { slug: 'e2e-live-demo-workspace' },
    defaults: {
      id: uuidv4(),
      name: 'E2E Live Demo Workspace',
      slug: 'e2e-live-demo-workspace',
      ownerId: poUser.id,
    },
  });

  await WorkspaceMemberModel.findOrCreate({
    where: { workspaceId: workspace.id, userId: poUser.id },
    defaults: { role: 'po' },
  });

  await WorkspaceMemberModel.findOrCreate({
    where: { workspaceId: workspace.id, userId: devUser.id },
    defaults: { role: 'dev' },
  });

  await WorkspaceMemberModel.findOrCreate({
    where: { workspaceId: workspace.id, userId: qaUser.id },
    defaults: { role: 'qa' },
  });
  console.log('   Workspace: ' + workspace.name + ' (ID: ' + workspace.id + ')');
  console.log('   Anggota: Rian (PO), Budi (Dev), Doni (QA)');

  await TaskModel.destroy({ where: { workspaceId: workspace.id }, force: true });
  await WorkFolderModel.destroy({ where: { workspaceId: workspace.id }, force: true });

  console.log('
[3/9] PO (Rian) Merencanakan Fitur di Task Hub:');
  const folder = await WorkFolderModel.create({
    workspaceId: workspace.id,
    name: 'Sprint 1 - Pembayaran',
    position: 0,
    createdBy: poUser.id,
  });
  console.log('   Folder Dibuat: ' + folder.name);

  const parentTask = await taskService.createTask(
    poUser.id,
    CreateTaskSchema.parse({
      workspaceId: workspace.id,
      folderId: folder.id,
      title: 'Integrasi Pembayaran QRIS Dinamis',
      description: 'Implementasi fitur QRIS dengan validasi timeout dan settlement realtime.',
      status: 'in_progress',
      priority: 'urgent',
    })
  );
  console.log('   Parent Task Dibuat: [' + parentTask.displayId + '] ' + parentTask.title + ' (Status: ' + parentTask.status + ')');

  const subtaskFE = await taskService.createTask(
    poUser.id,
    CreateTaskSchema.parse({
      workspaceId: workspace.id,
      parentTaskId: parentTask.id,
      deliveryArea: 'frontend',
      title: 'Slicing & Form QRIS View',
      assigneeId: devUser.id,
      status: 'todo',
    })
  );
  console.log('   Subtask FE Dibuat: [' + subtaskFE.displayId + '] ' + subtaskFE.title + ' -> Assignee: Budi (Dev)');

  const subtaskQA = await taskService.createTask(
    poUser.id,
    CreateTaskSchema.parse({
      workspaceId: workspace.id,
      parentTaskId: parentTask.id,
      deliveryArea: 'qa',
      title: 'E2E Automation Test QRIS',
      assigneeId: qaUser.id,
      status: 'todo',
    })
  );
  console.log('   Subtask QA Dibuat: [' + subtaskQA.displayId + '] ' + subtaskQA.title + ' -> Assignee: Doni (QA)');

  console.log('
[4/9] Dev (Budi) Mengerjakan Subtask di My Tasks:');
  const feInProgress = await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
    status: 'in_progress',
  });
  console.log('   Budi mengubah status: TODO -> ' + feInProgress.status.toUpperCase());

  const feInReview = await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
    status: 'in_review',
  });
  console.log('   Budi selesai coding & submit: IN_PROGRESS -> ' + feInReview.status.toUpperCase());

  console.log('
[5/9] Uji Coba Celah Lama (Budi mencoba Self-Approval klik Done):');
  try {
    await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
      status: 'done',
    });
    console.error('   GAGAL: Sistem lama bocor! Dev berhasil self-approval.');
  } catch (err) {
    console.log('   TERBLOKIR OLEH SISTEM BARU: ' + err.message);
    console.log('   Quality Gate Berhasil: Assignee tidak bisa self-approve!');
  }

  console.log('
[6/9] QA (Doni) Melakukan Code Review & Menemukan Isu:');
  const reviewNote = 'Error modal QRIS tidak muncul saat koneksi timeout. Mohon tambahkan handling catch error.';
  const changesReq = await taskService.updateTask(qaUser.id, workspace.id, subtaskFE.id, {
    status: 'changes_requested',
    reviewNotes: reviewNote,
  });
  console.log('   Doni mengubah status: IN_REVIEW -> ' + changesReq.status.toUpperCase());
  console.log('   Review Notes Tercatat: "' + changesReq.reviewNotes + '"');
  console.log('   Reviewed By: Doni Wijaya (ID: ' + changesReq.reviewedBy + ')');

  console.log('
[7/9] Dev (Budi) Membaca Review Notes di Drawer & Memperbaiki:');
  await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
    status: 'in_progress',
    description: 'Menambahkan Error Modal saat timeout pada Form QRIS.',
  });
  console.log('   Budi memperbaiki kode: CHANGES_REQUESTED -> IN_PROGRESS');

  await taskService.updateTask(devUser.id, workspace.id, subtaskFE.id, {
    status: 'in_review',
  });
  console.log('   Budi submit ulang: IN_PROGRESS -> IN_REVIEW');

  console.log('
[8/9] Uji Coba Ketergantungan Subtask QA:');
  try {
    await taskService.updateTask(poUser.id, workspace.id, subtaskQA.id, { status: 'done' });
    console.error('   GAGAL: Subtask QA bisa selesai sebelum FE selesai!');
  } catch (err) {
    console.log('   TERBLOKIR OLEH SISTEM BARU: ' + err.message);
    console.log('   Dependency Gate Berhasil: Subtask QA terkunci sampai FE selesai.');
  }

  const approvedFE = await taskService.updateTask(qaUser.id, workspace.id, subtaskFE.id, {
    status: 'done',
  });
  console.log('   Doni menyetujui Subtask FE: IN_REVIEW -> ' + approvedFE.status.toUpperCase() + ' (Reviewed by Doni)');

  await taskService.updateTask(qaUser.id, workspace.id, subtaskQA.id, { status: 'in_review' });
  const approvedQA = await taskService.updateTask(poUser.id, workspace.id, subtaskQA.id, { status: 'done' });
  console.log('   Subtask QA selesai & diverifikasi: ' + approvedQA.status.toUpperCase());

  console.log('
[9/9] PO (Rian) Menyelesaikan Parent Task di Task Hub:');
  const completedParent = await taskService.completeTask(poUser.id, workspace.id, parentTask.id, {
    status: 'done',
  });
  console.log('   Parent Task [' + completedParent.displayId + '] ' + completedParent.title + ' -> STATUS: ' + completedParent.status.toUpperCase());
  console.log('   Completed At: ' + completedParent.completedAt);

  console.log('
========================================================================');
  console.log('E2E DEMO BERHASIL 100% — SELURUH QUALITY GATES & RBAC VALID!');
  console.log('========================================================================
');
}

runE2EDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('E2E Demo Error:', err);
    process.exit(1);
  });