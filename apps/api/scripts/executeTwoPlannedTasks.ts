import { sequelize } from '../src/db/sequelize.js';
import {
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  UserModel,
  WorkFolderModel,
  TaskModel,
  RequirementModel,
  AcceptanceCriterionModel,
  TaskRequirementModel,
  QaDocumentModel,
  QaDocumentVersionModel,
} from '../src/db/models/index.js';
import { aiTaskGeneratorService } from '../src/modules/ai/aiTaskGeneratorService.js';
import { taskService } from '../src/modules/tasks/taskService.js';
import { qaDocumentService } from '../src/modules/qaDocuments/qaDocumentService.js';
import { requirementService } from '../src/modules/requirements/requirementService.js';
import { CreateTaskSchema } from '@qlick/contracts';

async function main() {
  console.log('========================================================================');
  console.log('🚀 EKSEKUSI PEMBUATAN 2 TASK LENGKAP: 1 METODE AI & 1 METODE MANUAL');
  console.log('========================================================================\n');

  await sequelize.authenticate();
  console.log('✅ Terhubung ke database PostgreSQL.');

  // 1. Identifikasi Workspace
  const workspace = await WorkspaceModel.findOne({
    where: { slug: 'essensial' },
  });
  if (!workspace) {
    throw new Error('Workspace "essensial" tidak ditemukan.');
  }
  console.log(`📌 Workspace: "${workspace.name}" [ID: ${workspace.id}]`);

  // 2. Identifikasi / Buat Folder Aktif (Unarchived)
  let folder = await WorkFolderModel.findOne({
    where: { workspaceId: workspace.id, archivedAt: null },
  });
  if (!folder) {
    folder = await WorkFolderModel.create({
      workspaceId: workspace.id,
      name: 'Sprint Perencanaan Fitur Q4',
      position: 1,
      createdBy: workspace.ownerId,
    });
    console.log(`📁 Folder Baru Dibuat: "${folder.name}" [ID: ${folder.id}]`);
  } else {
    console.log(`📁 Folder Aktif Ditemukan: "${folder.name}" [ID: ${folder.id}]`);
  }

  // 3. Identifikasi Anggota Tim (PO, Dev FE, Dev BE, QA)
  const poMember = await WorkspaceMemberModel.findOne({
    where: { workspaceId: workspace.id, role: 'po' },
    include: [{ model: UserModel, as: 'user' }],
  });
  const devMembers = await WorkspaceMemberModel.findAll({
    where: { workspaceId: workspace.id, role: 'dev' },
    include: [
      { model: UserModel, as: 'user' },
      { model: WorkspaceMemberSpecialtyModel, as: 'specialties' },
    ],
  });
  const qaMember = await WorkspaceMemberModel.findOne({
    where: { workspaceId: workspace.id, role: 'qa' },
    include: [{ model: UserModel, as: 'user' }],
  });

  const poUserId = poMember?.userId || workspace.ownerId;
  const devFeUserId = devMembers[0]?.userId || poUserId;
  const devBeUserId = devMembers[1]?.userId || devMembers[0]?.userId || poUserId;
  const qaUserId = qaMember?.userId || poUserId;

  // Pastikan specialty frontend dan backend tersedia untuk penugasan subtask dev
  const memberFE = await WorkspaceMemberModel.findOne({ where: { workspaceId: workspace.id, userId: devFeUserId } });
  if (memberFE) {
    await WorkspaceMemberSpecialtyModel.findOrCreate({
      where: { workspaceMemberId: memberFE.id, specialty: 'frontend' },
      defaults: {
        workspaceId: workspace.id,
        workspaceMemberId: memberFE.id,
        specialty: 'frontend',
        createdBy: workspace.ownerId,
      },
    });
  }
  const memberBE = await WorkspaceMemberModel.findOne({ where: { workspaceId: workspace.id, userId: devBeUserId } });
  if (memberBE) {
    await WorkspaceMemberSpecialtyModel.findOrCreate({
      where: { workspaceMemberId: memberBE.id, specialty: 'backend' },
      defaults: {
        workspaceId: workspace.id,
        workspaceMemberId: memberBE.id,
        specialty: 'backend',
        createdBy: workspace.ownerId,
      },
    });
  }

  console.log(`👥 Anggota Tim:`);
  console.log(`   - PO     : [${poUserId}] ${(poMember as any)?.user?.name || 'PO'}`);
  console.log(`   - Dev FE : [${devFeUserId}] ${(devMembers[0] as any)?.user?.name || 'Dev FE'}`);
  console.log(`   - Dev BE : [${devBeUserId}] ${(devMembers[1] as any)?.user?.name || 'Dev BE'}`);
  console.log(`   - QA     : [${qaUserId}] ${(qaMember as any)?.user?.name || 'QA'}`);

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startDateStr = today.toISOString().split('T')[0];
  const dueDateStr = nextWeek.toISOString().split('T')[0];

  console.log('\n------------------------------------------------------------------------');
  console.log('🤖 [TASK 1] VERIFIKASI / PEMBUATAN TASK VIA ALUR AI (aiTaskGeneratorService)');
  console.log('------------------------------------------------------------------------');

  const task1Title = 'Otentikasi Multi-Faktor (2FA/MFA) via TOTP Authenticator';
  let task1 = await TaskModel.findOne({
    where: { workspaceId: workspace.id, title: task1Title, parentTaskId: null },
  });

  if (!task1) {
    const aiDraftInput = {
      workspaceId: workspace.id,
      folderId: folder.id,
      task: {
        title: task1Title,
        description:
          'Mengamankan akun pengguna dengan lapisan proteksi tambahan standar RFC 6238 TOTP. ' +
          'Pengguna dapat memindai QR code dari Google Authenticator / Authy, memverifikasi token 6-digit, ' +
          'mengunduh 8 backup recovery codes darurat, dan wajib memasukkan kode saat proses login.',
        priority: 'high' as const,
        startDate: startDateStr,
        dueDate: dueDateStr,
      },
      productBrief: {
        context:
          'Akun pengguna rentan terhadap pembajakan kredensial (credential stuffing / phishing). ' +
          'Fitur 2FA berbasis TOTP menyediakan verifikasi identitas tingkat lanjut tanpa biaya SMS.',
        inScope: [
          'Setup registrasi secret key TOTP via QR Code (SVG) dan kunci teks manual',
          'Verifikasi token 6-digit saat aktivasi dengan validasi drift waktu 30 detik',
          'Generasi 8 emergency backup codes acak sekali pakai dengan penyimpanan hash di database',
          'Interseptor alur login: meminta kode 2FA setelah verifikasi email dan kata sandi berhasil',
          'Penonaktifan 2FA dari Pengaturan Akun dengan verifikasi ulang kata sandi',
        ],
        outScope: [
          'Pengiriman OTP via SMS atau WhatsApp',
          'Kunci keamanan fisik FIDO2 / WebAuthn hardware key (fase selanjutnya)',
        ],
      },
      requirements: [
        {
          title: 'Alur Setup dan Aktivasi 2FA TOTP',
          description: 'Menyediakan onboarding aman bagi pengguna untuk mendaftarkan aplikasi authenticator.',
          acceptanceCriteria: [
            'Given pengguna berada di Pengaturan Keamanan, when klik "Aktifkan 2FA", then QR Code dan string secret manual ditampilkan.',
            'Given form setup 2FA terbuka, when memasukkan token 6-digit valid, then 2FA aktif dan 8 backup codes ditampilkan untuk diunduh.',
            'Given token 6-digit salah atau kedaluwarsa, when submit, then sistem menolak dan 2FA tetap non-aktif.',
          ],
        },
        {
          title: 'Penegakan Verifikasi 2FA saat Login',
          description: 'Menghalangi penerbitan sesi penuh sampai tantangan token kedua berhasil diselesaikan.',
          acceptanceCriteria: [
            'Given pengguna dengan 2FA aktif berhasil mengisi email dan password, when login disubmit, then diarahkan ke layar input 2FA.',
            'Given berada di layar input 2FA, when memasukkan 6-digit TOTP atau backup code valid, then sesi login JWT diterbitkan.',
          ],
        },
      ],
      subtasks: [
        {
          title: 'FE-MFA-01: Antarmuka Setup 2FA, Modal Backup Codes, & Form Tantangan Login',
          description:
            'Slicing UI Pengaturan Keamanan, komponen QR code visual, modal unduh backup codes, dan stepper login step-2 untuk tantangan OTP.',
          deliveryArea: 'frontend' as const,
          priority: 'high' as const,
          enabled: true,
        },
        {
          title: 'BE-MFA-01: Engine Kriptografi TOTP, API Setup, & Interseptor Login 2FA',
          description:
            'Migrasi additive secret & backup codes pada model User; endpoint setup, verify, disable; dan adaptasi session handler login.',
          deliveryArea: 'backend' as const,
          priority: 'high' as const,
          enabled: true,
        },
        {
          title: 'QA-MFA-01: Pengujian Siklus E2E TOTP, Validasi Jam Server, & Pengujian Backup Codes',
          description:
            'Penyusunan Test Cases pengujian aktivasi, login sukses, toleransi drift waktu 30s, dan validasi hangus backup code sekali pakai.',
          deliveryArea: 'qa' as const,
          priority: 'high' as const,
          enabled: true,
        },
      ],
    };

    const aiApplyResult = await aiTaskGeneratorService.applyDraft(workspace.id, poUserId, aiDraftInput);
    task1 = await TaskModel.findByPk(aiApplyResult.task.id);
    console.log(`✅ [TASK 1] Berhasil Dibuat via AI Generator.`);
  } else {
    // Pastikan folderId terhubung ke folder aktif yang tidak diarsipkan
    task1.folderId = folder.id;
    await task1.save();
    console.log(`✅ [TASK 1] Task AI Ditemukan & Folder Diperbarui ke "${folder.name}".`);
  }

  console.log(`   - Root Task ID : ${task1!.id}`);
  console.log(`   - Judul        : "${task1!.title}"`);
  console.log(`   - Status       : ${task1!.status} | Prioritas: ${task1!.priority}`);

  // Update assignees and dates for Task 1 subtasks
  const subtasks1 = await TaskModel.findAll({
    where: { parentTaskId: task1!.id, workspaceId: workspace.id },
    order: [['createdAt', 'ASC']],
  });
  for (const st of subtasks1) {
    if (st.deliveryArea === 'frontend') st.assigneeId = devFeUserId;
    else if (st.deliveryArea === 'backend') st.assigneeId = devBeUserId;
    else if (st.deliveryArea === 'qa') st.assigneeId = qaUserId;
    st.folderId = folder.id;
    st.startDate = startDateStr as any;
    st.dueDate = dueDateStr as any;
    await st.save();
    console.log(`   └─ Subtask: "${st.title}" [${st.deliveryArea}] -> Assignee: ${st.assigneeId}`);
  }

  console.log('\n------------------------------------------------------------------------');
  console.log('✍️ [TASK 2] MEMBUAT TASK VIA ALUR MANUAL (Services Step-by-Step)');
  console.log('------------------------------------------------------------------------');

  const task2Title = 'Ekspor Jejak Audit Aktivitas Workspace ke Format CSV dan Excel (XLSX)';
  let task2 = await TaskModel.findOne({
    where: { workspaceId: workspace.id, title: task2Title, parentTaskId: null },
  });

  if (!task2) {
    // Step 1: Buat Root Task via taskService
    const task2Input = CreateTaskSchema.parse({
      workspaceId: workspace.id,
      folderId: folder.id,
      title: task2Title,
      description:
        'Menyediakan kemampuan bagi Workspace Owner dan Admin untuk mengekspor riwayat lengkap aktivitas ' +
        'perubahan task, subtask, dokumen, dan pengujian ke berkas CSV/XLSX dengan penyaringan tanggal dan tipe entitas.',
      priority: 'medium',
      status: 'todo',
      startDate: startDateStr,
      dueDate: dueDateStr,
    });

    const createdTask2 = await taskService.createTask(poUserId, task2Input);
    task2 = await TaskModel.findByPk(createdTask2.id);
    console.log(`✅ [Step 1] Root Feature Dibuat: "${task2!.title}" [ID: ${task2!.id}]`);
  } else {
    task2.folderId = folder.id;
    await task2.save();
    console.log(`✅ [Step 1] Root Feature Ditemukan: "${task2!.title}" [ID: ${task2!.id}]`);
  }

  // Step 2: Simpan Product Brief via qaDocumentService
  const productBrief = await qaDocumentService.upsertProductBrief(
    workspace.id,
    task2!.id,
    poUserId,
    {
      title: 'Ringkasan Produk: Ekspor Jejak Audit',
      contentMarkdown:
        'Kebutuhan audit kepatuhan regulasi (SOC2 / ISO 27001) mewajibkan tersedianya ekstraksi berkas riwayat aktivitas ' +
        'untuk pelaporan berkala manajemen dan auditor eksternal.',
      inScope: [
        'Filter rentang tanggal kustom (Date Range Picker)',
        'Filter berdasarkan aktor/pengguna dan kategori aktivitas',
        'Generator berkas CSV dengan UTF-8 with BOM',
        'Generator berkas XLSX dengan styling header dan lebar kolom dinamis',
        'Proteksi RBAC: hanya dapat diakses oleh peran Owner dan Admin',
      ].map((text, idx) => ({ id: `audit-in-${idx + 1}`, position: idx + 1, text })),
      outScope: [
        'Pengiriman otomatis terjadwal via email harian/mingguan',
        'Integrasi streaming langsung ke platform SIEM eksternal (Splunk / Datadog)',
      ].map((text, idx) => ({ id: `audit-out-${idx + 1}`, position: idx + 1, text })),
      acceptanceCriteria: [
        'Ekspor 50.000 baris log selesai dalam waktu di bawah 5 detik',
        'Format tanggal dalam berkas konsisten menggunakan standar ISO 8601 lokal',
      ].map((text, idx) => ({ id: `audit-ac-${idx + 1}`, position: idx + 1, text })),
      status: 'draft',
    },
  );
  console.log(`✅ [Step 2] Product Brief Disimpan: "${productBrief.currentVersion.title}" (Versi ${productBrief.currentVersion.version})`);

  // Step 3: Buat Requirements & Acceptance Criteria via requirementService
  let req1 = await RequirementModel.findOne({ where: { workspaceId: workspace.id, code: 'REQ-AUDIT-01' } });
  if (!req1) {
    const createdReq1 = await requirementService.createRequirement(workspace.id, poUserId, {
      code: 'REQ-AUDIT-01',
      title: 'Penyaringan Data Log Aktivitas sebelum Ekspor',
      description: 'Menyediakan filter kueri yang presisi untuk membatasi cakupan log yang diunduh.',
    });
    req1 = await RequirementModel.findByPk(createdReq1.id);
    await requirementService.linkRequirementToTask(workspace.id, task2!.id, poUserId, req1!.id);
    await requirementService.createAcceptanceCriterion(workspace.id, req1!.id, poUserId, {
      text: 'Given Admin membuka halaman Audit, when memilih tanggal mulai dan akhir, then baris data yang diekspor terfilter akurat.',
      sequence: 1,
    });
    await requirementService.createAcceptanceCriterion(workspace.id, req1!.id, poUserId, {
      text: 'Given kategori dipilih "release", when ekspor dijalankan, then hanya log keputusan rilis dan sign-off yang diekstraksi.',
      sequence: 2,
    });
  } else {
    const link = await TaskRequirementModel.findOne({ where: { workspaceId: workspace.id, taskId: task2!.id, requirementId: req1.id } });
    if (!link) {
      await requirementService.linkRequirementToTask(workspace.id, task2!.id, poUserId, req1.id);
    }
  }

  let req2 = await RequirementModel.findOne({ where: { workspaceId: workspace.id, code: 'REQ-AUDIT-02' } });
  if (!req2) {
    const createdReq2 = await requirementService.createRequirement(workspace.id, poUserId, {
      code: 'REQ-AUDIT-02',
      title: 'Format Berkas Ekspor & Otorisasi RBAC',
      description: 'Menjamin integritas encoding berkas CSV/XLSX dan memblokir pengguna tanpa otorisasi.',
    });
    req2 = await RequirementModel.findByPk(createdReq2.id);
    await requirementService.linkRequirementToTask(workspace.id, task2!.id, poUserId, req2!.id);
    await requirementService.createAcceptanceCriterion(workspace.id, req2!.id, poUserId, {
      text: 'Given tombol "Ekspor CSV" diklik, when unduhan selesai, then nama berkas sesuai format audit-log-[slug]-[YYYYMMDD].csv.',
      sequence: 1,
    });
    await requirementService.createAcceptanceCriterion(workspace.id, req2!.id, poUserId, {
      text: 'Given pengguna berstatus Developer atau QA, when memanggil endpoint ekspor, then backend menolak dengan kode HTTP 403 Forbidden.',
      sequence: 2,
    });
  } else {
    const link = await TaskRequirementModel.findOne({ where: { workspaceId: workspace.id, taskId: task2!.id, requirementId: req2.id } });
    if (!link) {
      await requirementService.linkRequirementToTask(workspace.id, task2!.id, poUserId, req2.id);
    }
  }
  console.log(`✅ [Step 3] Requirements & AC Ditautkan: 2 Requirement dengan 4 Acceptance Criteria Gherkin`);

  // Step 4: Buat Subtasks Teknis via taskService jika belum ada
  const existingSubtasks2 = await TaskModel.findAll({
    where: { parentTaskId: task2!.id, workspaceId: workspace.id },
  });

  if (existingSubtasks2.length === 0) {
    const subtaskFE2 = await taskService.createTask(
      poUserId,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        parentTaskId: task2!.id,
        deliveryArea: 'frontend',
        title: 'FE-AUDIT-01: Panel Filter Tanggal, Dropdown Format, & Indikator Unduhan',
        description:
          'Implementasi toolbar filter rentang tanggal, pemilih format (.csv / .xlsx), dialog konfirmasi jumlah baris, dan toast/spinner status unduhan.',
        status: 'todo',
        priority: 'medium',
        assigneeId: devFeUserId,
        startDate: startDateStr,
        dueDate: dueDateStr,
      }),
    );

    const subtaskBE2 = await taskService.createTask(
      poUserId,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        parentTaskId: task2!.id,
        deliveryArea: 'backend',
        title: 'BE-AUDIT-01: Streaming Endpoint Ekspor Audit Log & Proteksi RBAC',
        description:
          'Penyusunan query streaming kursor PostgreSQL untuk dataset besar, parser CSV UTF-8 BOM, builder XLSX OpenXML, dan middleware pembatas hak akses.',
        status: 'todo',
        priority: 'medium',
        assigneeId: devBeUserId,
        startDate: startDateStr,
        dueDate: dueDateStr,
      }),
    );

    const subtaskQA2 = await taskService.createTask(
      poUserId,
      CreateTaskSchema.parse({
        workspaceId: workspace.id,
        folderId: folder.id,
        parentTaskId: task2!.id,
        deliveryArea: 'qa',
        title: 'QA-AUDIT-01: Pengujian Batas Integritas Data Ekspor, Uji Karakter Khusus, & Hak Akses',
        description:
          'Penyusunan Test Case validasi baris database vs isi berkas, uji karakter unicode/emoticon pada CSV Excel, dan pembuktian blokir 403 untuk dev/qa.',
        status: 'todo',
        priority: 'medium',
        assigneeId: qaUserId,
        startDate: startDateStr,
        dueDate: dueDateStr,
      }),
    );

    console.log(`✅ [Step 4] Subtasks Berhasil Dibuat:`);
    console.log(`   └─ "${subtaskFE2.title}" (FE) -> Assignee: ${subtaskFE2.assigneeId}`);
    console.log(`   └─ "${subtaskBE2.title}" (BE) -> Assignee: ${subtaskBE2.assigneeId}`);
    console.log(`   └─ "${subtaskQA2.title}" (QA) -> Assignee: ${subtaskQA2.assigneeId}`);
  } else {
    console.log(`✅ [Step 4] ${existingSubtasks2.length} Subtask Manual sudah ada.`);
  }

  // Verifikasi Pembacaan Data Lengkap dari Database PostgreSQL
  console.log('\n========================================================================');
  console.log('🔍 VERIFIKASI DATA PERSISTEN KEDUA TASK DI DATABASE POSTGRESQL');
  console.log('========================================================================');

  const allSubtasks2 = await TaskModel.findAll({
    where: { parentTaskId: task2!.id, workspaceId: workspace.id },
    order: [['createdAt', 'ASC']],
  });
  const task2ReqLinks = await TaskRequirementModel.findAll({
    where: { taskId: task2!.id, workspaceId: workspace.id },
    include: [{ model: RequirementModel, as: 'requirement' }],
  });
  const task2Brief = await qaDocumentService.getProductBrief(workspace.id, task2!.id, poUserId);

  const task1ReqLinks = await TaskRequirementModel.findAll({
    where: { taskId: task1!.id, workspaceId: workspace.id },
    include: [{ model: RequirementModel, as: 'requirement' }],
  });
  const task1Brief = await qaDocumentService.getProductBrief(workspace.id, task1!.id, poUserId);

  console.log(`\n📌 [TASK 1 - AI GENERATOR]`);
  console.log(`   - ID Database : ${task1!.id}`);
  console.log(`   - Judul       : "${task1!.title}"`);
  console.log(`   - Folder      : "${folder.name}"`);
  console.log(`   - Brief       : ${task1Brief ? `Ada (${task1Brief.currentVersion.inScope.length} In-Scope, ${task1Brief.currentVersion.outScope.length} Out-Scope)` : 'Tidak Ada'}`);
  console.log(`   - Requirements: ${task1ReqLinks.length} Kebutuhan Terhubung`);
  console.log(`   - Subtasks (${subtasks1.length}):`);
  for (const st of subtasks1) {
    console.log(`     • [${st.deliveryArea?.toUpperCase()}] ${st.title} | Status: ${st.status} | Assignee: ${st.assigneeId}`);
  }

  console.log(`\n📌 [TASK 2 - MANUAL PLANNER]`);
  console.log(`   - ID Database : ${task2!.id}`);
  console.log(`   - Judul       : "${task2!.title}"`);
  console.log(`   - Folder      : "${folder.name}"`);
  console.log(`   - Brief       : ${task2Brief ? `Ada (${task2Brief.currentVersion.inScope.length} In-Scope, ${task2Brief.currentVersion.outScope.length} Out-Scope)` : 'Tidak Ada'}`);
  console.log(`   - Requirements: ${task2ReqLinks.length} Kebutuhan Terhubung`);
  console.log(`   - Subtasks (${allSubtasks2.length}):`);
  for (const st of allSubtasks2) {
    console.log(`     • [${st.deliveryArea?.toUpperCase()}] ${st.title} | Status: ${st.status} | Assignee: ${st.assigneeId}`);
  }

  console.log('\n========================================================================');
  console.log('🎉 SEMUA DATA BERHASIL DIBUAT DAN DIVERIFIKASI DARI POSTGRESQL');
  console.log('========================================================================\n');

  await sequelize.close();
}

main().catch((err) => {
  console.error('❌ Gagal mengeksekusi pembuatan task:', err);
  process.exit(1);
});
