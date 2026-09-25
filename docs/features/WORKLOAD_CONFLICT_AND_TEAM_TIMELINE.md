# WORKLOAD-CONFLICT-AND-TEAM-TIMELINE: Workload Conflict & Team Timeline

**Status:** Active  
**Owner:** Engineering and Product  
**Last reviewed:** 2026-09-25  
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-004`, `AUTH-011`, `FLOW-002`, `FLOW-004`, `FLOW-007`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`  

## 1. Tujuan dan Pengguna

Fitur ini memberikan transparansi beban kerja tim kepada Product Owner, Workspace Admin, dan Owner saat merencanakan atau mengubah Subtask. Sistem menyajikan deteksi irisan jadwal (Workload Conflict) secara advisory ketika pelaksana dan tanggal dipilih, serta menyediakan halaman visual khusus **Timeline Tim** pada rute `/reports`.

Pengguna fitur ini adalah:
- **Product Owner, Admin, dan Owner**: Mengatur penugasan Subtask, mengantisipasi bentrokan jadwal anggota tim, dan memantau kapasitas tim secara visual.
- **Developer dan QA**: Memahami alokasi waktu dan timeline kerja tim tanpa dibebani izin planning yang tidak sah.

Hal yang tidak termasuk dalam cakupan:
- Pemblokiran mutasi task (penugasan bersifat murni advisory).
- Auto-reassignment atau otomatisasi prioritas tanpa persetujuan manusia.
- Hak planning baru bagi Developer dan QA.

## 2. Requirement dan Acceptance Criteria

- **REQ-CAPACITY-1**: Deteksi Irisan Jadwal Subtask (Inclusive Overlap).
  - **AC-CAPACITY-1**: Irisan jadwal dihitung inklusif: `existing.startDate <= candidate.dueDate && existing.dueDate >= candidate.startDate`.
  - **AC-CAPACITY-2**: Hanya Subtask aktif yang diperhitungkan (`todo`, `in_progress`, `in_review`, `changes_requested`). Subtask `done` dan `canceled` diabaikan.
  - **AC-CAPACITY-3**: Subtask aktif tanpa jadwal tidak dianggap bentrok tanggal, melainkan disajikan sebagai "beban aktif tanpa jadwal; irisan waktu tidak dapat dinilai".
  - **AC-CAPACITY-4**: Saat mengedit Subtask, subtask yang sedang diedit dikecualikan dari perhitungan bentrok dirinya sendiri (`excludeSubtaskId`).
- **REQ-CAPACITY-2**: Redaksi Privasi Lintas Workspace (`AUTH-011`).
  - **AC-CAPACITY-5**: Detail konflik dari Workspace aktif menyertakan ID, judul, delivery area, status, dan tanggal.
  - **AC-CAPACITY-6**: Konflik dari Workspace lain wajib disamarkan (redacted): hanya menyajikan jumlah konflik dan rentang tanggal; tidak membocorkan judul task, nama Workspace, deskripsi, atau URL.
  - **AC-CAPACITY-7**: Detail lintas Workspace hanya dibuka jika aktor pemanggil terbukti memiliki keanggotaan aktif terautentikasi pada Workspace asal tersebut.
- **REQ-CAPACITY-3**: Sifat Penugasan Advisory (`FLOW-007`).
  - **AC-CAPACITY-8**: Peringatan bentrok jadwal tidak pernah menonaktifkan tombol simpan atau memblokir submit form.
- **REQ-CAPACITY-4**: Halaman Timeline Tim (`/reports`).
  - **AC-CAPACITY-9**: Halaman `/reports` dikosongkan dari dashboard analitik/chart lama dan menyajikan komponen `TeamCapacityTimeline`.
  - **AC-CAPACITY-10**: Timeline Tim mendukung skala Hari, Minggu, Bulan, dan pemilih rentang tanggal kustom.
  - **AC-CAPACITY-11**: Terdapat filter anggota, role, delivery area, status, serta scope Workspace (Workspace aktif vs Semua).
  - **AC-CAPACITY-12**: Satu baris per anggota dengan bar Subtask sesuai jadwal persisted, penanda "Hari Ini", scroll horizontal responsif, dan daftar khusus beban tanpa jadwal.
  - **AC-CAPACITY-13**: Warning konflik pada modal/accordion menyediakan tautan ke `/reports` dengan assignee dan rentang tanggal terfilter otomatis.

## 3. Alur Lintas Peran

1. **Owner / Admin / PO**:
   - Membuka modal buat Subtask (`CreateSubtaskModal`) atau tab detail Subtask (`SubtaskAccordionItem`).
   - Memilih pelaksana (Developer/QA) dan tanggal mulai serta tenggat.
   - Antarmuka secara debounced meminta preview konflik ke `POST /v1/workspaces/:workspaceId/capacity/assignment-preview`.
   - Jika terdapat irisan atau beban tanpa jadwal, banner peringatan advisory muncul dengan ringkasan bentrok dan tautan ke Timeline Tim.
   - Planner dapat tetap menyimpan Subtask kapan saja.
2. **Developer / QA**:
   - Melihat jadwal penugasan mereka di Timeline Tim (`/reports`) dalam mode baca-saja.
   - Tidak dapat memanggil endpoint preview perencanaan atau mengubah field jadwal/assignee.
3. **Penolakan & Otorisasi**:
   - Aktor non-planner yang memanggil endpoint preview konflik menerima `403 Forbidden`.
   - Aktor yang bukan anggota Workspace menerima `403 Forbidden` saat mengakses preview maupun timeline.

## 4. Data dan Relasi

- Entitas utama: `tasks` (dengan kolom `parent_task_id`, `assignee_id`, `status`, `start_date`, `due_date`, `delivery_area`, `workspace_id`).
- Relasi: `tasks.assignee_id -> users.id`, `tasks.workspace_id -> workspaces.id`, `workspace_members (workspace_id, user_id, role)`.
- Indeks: Ditambahkan indeks komposit additive `idx_tasks_assignee_status_schedule` pada `(assignee_id, status, start_date, due_date)` untuk efisiensi kueri beban kerja aktif.
- Risiko migrasi: Zero downtime, migrasi additive murni tanpa penghapusan atau modifikasi kolom eksisting.

## 5. API dan Shared Contract

- Modul kontrak: `packages/contracts/src/capacity.ts` diekspor di `packages/contracts/src/index.ts`.
- Endpoint:
  - `POST /v1/workspaces/:workspaceId/capacity/assignment-preview`
    - Input: `AssignmentConflictPreviewInputSchema` (`assigneeId`, `startDate`, `dueDate`, `excludeSubtaskId?`).
    - Output: `AssignmentConflictPreviewResponseSchema` (`hasConflict`, `conflictCount`, `conflicts[]`, `unscheduledActiveCount`, `unscheduledSubtasks[]`, `advisoryMessage`).
  - `GET /v1/workspaces/:workspaceId/capacity/timeline`
    - Query: `TeamCapacityTimelineQuerySchema` (`startDate?`, `endDate?`, `memberIds?`, `role?`, `deliveryArea?`, `status?`, `scope`).
    - Output: `TeamCapacityTimelineResponseSchema` (`workspaceId`, `startDate`, `endDate`, `scope`, `members[]`, agregat ringkasan).

## 6. Authorization

- **`AUTH-001`**: Aktor wajib terautentikasi dan merupakan anggota aktif Workspace.
- **`AUTH-002`**: Otorisasi ditegakkan di backend middleware dan policy, bukan di UI.
- **`AUTH-004` & `FLOW-002`**: Hak akses `POST /assignment-preview` dibatasi pada role `owner`, `admin`, `po`. Role `dev` dan `qa` ditolak `403 Forbidden`.
- **`AUTH-011`**: Redaksi otomatis diterapkan di backend jika data subtask berasal dari Workspace yang tidak dapat diakses oleh aktor.

## 7. UI dan Interaction States

- Komponen:
  - `apps/web/src/components/ui/organisms/CreateSubtaskModal.tsx`
  - `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx`
  - `apps/web/src/components/ui/organisms/TeamCapacityTimeline.tsx`
  - `apps/web/src/pages/ReportPage.tsx`
- States:
  - **Loading**: Indikator spinner/skeleton saat preview konflik atau data timeline dimuat.
  - **Empty**: Tampilan informatif ketika tidak ada anggota atau tidak ada task terjadwal dalam rentang waktu.
  - **Conflict Warning**: Banner advisory kuning/amber dengan ringkasan bentrok, pemisahan item lokal vs teredaksi, dan link ke timeline.
  - **Error & Retry**: Pesan kesalahan tersanitasi disertai tombol coba lagi jika koneksi gagal.
  - **Disabled**: Tombol atau kontrol dinonaktifkan saat sedang submit atau memuat.
  - **Permission-denied**: Peringatan akses ditolak jika mencoba mengakses resource tanpa izin.
- Aksesibilitas & Tema: Mengikuti Stitch design system (`#B1E743`, font Inter, dark/light contrast WCAG AAA, atribut ARIA, fokus keyboard).

## 8. Pengujian dan Evidence

- **Contract Tests**: `packages/contracts/src/contracts.test.ts` memvalidasi parsing skema Zod input dan output preview konflik serta timeline tim.
- **PostgreSQL Integration Tests**: `apps/api/src/modules/capacity/__tests__/capacityApiIntegration.test.ts` membuktikan:
  - Overlap inklusif pada rentang tanggal yang bersinggungan.
  - Pengecualian task sendiri saat edit (`excludeSubtaskId`).
  - Pengabaian status `done` dan `canceled`.
  - Pelaporan subtask aktif tanpa tanggal sebagai beban tanpa jadwal.
  - Penegakan redaksi privasi lintas Workspace (disamarkan untuk non-anggota, terbuka untuk anggota).
  - Penolakan otorisasi 403 bagi role dev/qa pada preview dan non-anggota pada timeline.
- **Frontend Tests**:
  - `CreateSubtaskModal.test.tsx`: Render preview, banner konflik, deep link ke `/reports`, non-blocking submission.
  - `SubtaskAccordionItem.test.tsx`: Trigger preview pada edit detail subtask dengan `excludeSubtaskId`.
  - `TeamCapacityTimeline.test.tsx`: Render skala waktu, bar per anggota, daftar beban tanpa jadwal, penanda Hari Ini.
  - `ReportPage.test.tsx`: Render murni Timeline Tim dan inisialisasi filter dari search parameters.

## 9. Release dan Readiness

- Fitur tidak mengubah siklus rilis atau sign-off QA.
- Readiness rilis produk (`RELEASE-001`, `RELEASE-002`, `RELEASE-003`) tidak dipengaruhi secara langsung karena kapasitas bersifat advisory.
- Komponen lama `TaskReportDashboard` dipertahankan terisolasi untuk menjamin tidak ada breaking change.

## 10. Traceability

- **Requirement**: REQ-CAPACITY-1, REQ-CAPACITY-2, REQ-CAPACITY-3, REQ-CAPACITY-4
- **Acceptance Criteria**: AC-CAPACITY-1 s/d AC-CAPACITY-13
- **Policies**: `AUTH-001`, `AUTH-002`, `AUTH-004`, `AUTH-011`, `FLOW-002`, `FLOW-004`, `FLOW-007`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`
- **Architecture Decisions**: [Keputusan Privasi Kapasitas Lintas Workspace](../adr)
- **Implementasi**:
  - `packages/contracts/src/capacity.ts`
  - `apps/api/src/modules/capacity/capacityService.ts`
  - `apps/api/src/modules/capacity/capacityController.ts`
  - `apps/api/src/modules/capacity/capacityRoutes.ts`
  - `apps/web/src/components/ui/organisms/TeamCapacityTimeline.tsx`
  - `apps/web/src/pages/ReportPage.tsx`
