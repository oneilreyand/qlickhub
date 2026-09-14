# MY-TASKS-CREATED-BY-ME — Tampilan Task yang Dibuat Pengguna

**Status:** Active

**Owner:** Product and Engineering

**Last reviewed:** 2026-09-14
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `FLOW-004`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Setiap anggota Workspace dapat menemukan seluruh root Task non-deleted yang dibuat oleh akun mereka
sendiri tanpa mencampurnya dengan antrean tindakan sesuai peran. Tab **Perlu Perhatian** tetap
menjawab pekerjaan berikutnya yang harus dilakukan, sedangkan tab **Dibuat oleh Saya** menjawab
Task apa yang pernah dibuat pengguna di Workspace aktif.

Fitur ini tidak memperluas izin membuat, merencanakan, memperbarui, atau menghapus Task. Delegasi
pembuatan root Task untuk Developer dan QA tetap mengikuti kebijakan Workspace yang sudah ada.

## 2. Requirement dan Acceptance Criteria

1. Tab **Perlu Perhatian** mempertahankan antrean backend-derived dan seluruh perilakunya.
2. Tab **Dibuat oleh Saya** hanya memuat root Task dengan `reporterId` pengguna terautentikasi,
   `workspaceId` Workspace aktif, dan tanpa soft-deleted Task.
3. Hasil berlaku konsisten untuk Owner, Admin, PO, Developer, dan QA, termasuk root Task yang dibuat
   Developer/QA melalui delegasi yang sah.
4. Setiap hasil menampilkan status, prioritas, rentang jadwal, dan progres Subtask persisten.
5. Pencarian, filter status/prioritas, pagination, loading, empty, filtered-empty, error, dan
   permission-denied tersedia dan dapat dioperasikan dengan keyboard pada desktop maupun mobile.
6. Membuka hasil menggunakan endpoint detail Task dan pemeriksaan akses yang sudah ada.

## 3. Alur Lintas Peran

Pengguna membuka **Tugas Saya** dan tetap melihat **Perlu Perhatian** sebagai tab awal. Setelah
memilih **Dibuat oleh Saya**, frontend meminta halaman root Task milik reporter saat ini dari
Workspace aktif. Owner/Admin/PO melihat root Task buatannya sendiri; Developer/QA juga melihat root
Task yang pernah mereka buat melalui delegasi, walaupun delegasi kemudian berakhir atau dicabut.

Memilih satu Task memuat detail terotorisasi yang sama dengan antrean lama. Perubahan di drawer atau
pembuatan Task baru memicu pemuatan ulang daftar dan antrean, tanpa menduplikasi mutation flow.

## 4. Data dan Relasi

Data berasal dari tabel `tasks` dengan relasi root `parentTaskId = null`, kepemilikan
`workspaceId`, dan pencipta `reporterId`. Ringkasan Subtask dihitung backend dari Subtask persisten.
Soft-deleted Task tetap dikecualikan oleh model Sequelize. Tidak ada tabel, kolom, indeks, audit
mutation, atau migrasi baru.

## 5. API dan Shared Contract

- `GET /v1/workspaces/:workspaceId/tasks?myTasksOnly=true&rootOnly=true` menetapkan kombinasi query
  tersebut sebagai daftar root Task yang dibuat pengguna saat ini.
- Filter `search`, `status`, `priority`, `page`, dan `limit` tetap memakai
  `TaskListQuerySchema` di `packages/contracts/src/task.ts`.
- `includeSubtaskSummary=true` mengisi ringkasan progres pada `TaskListResponseSchema` yang sudah ada.
- Tidak ada field request/response baru dan tidak ada kontrak bentuk data yang diduplikasi di UI.

## 6. Authorization

Route tetap memerlukan autentikasi dan membership aktif melalui `requireWorkspaceMember`. Query
menetapkan `workspaceId` dari path serta `reporterId` dari identitas sesi; frontend tidak dapat
memilih reporter lain. Detail tetap melalui `assertCanAccessTask`. Fitur baca ini tidak memberikan
izin planning atau mutation baru kepada Developer/QA.

## 7. UI dan Interaction States

Route `/my-tasks` menggunakan `MyTasksDashboard`, komponen `Tabs`, atom input/select/button/badge,
dan panel baru pada lapisan organism My Tasks. Tab utama memakai semantik tablist/tab, roving focus,
ArrowLeft/ArrowRight/Home/End, target sentuh minimal 44 piksel, layout kartu responsif, dan token
Stitch yang sudah disetujui.

Panel menangani loading, daftar kosong, hasil filter kosong, error dengan retry, permission-denied,
success, serta disabled/loading ketika detail Task sedang dibuka.

## 8. Pengujian dan Evidence

- Contract/unit test memastikan kombinasi query boolean tetap tervalidasi.
- PostgreSQL/API integration test membuktikan reporter scope untuk Planner, Developer, dan QA,
  isolasi Workspace, root-only, soft deletion, filter, dan ringkasan Subtask.
- Component/hook tests membuktikan kedua tab, semua state, filter, pagination, keyboard navigation,
  serta pembukaan detail terotorisasi.
- Frontend build, repository validation, dan pemeriksaan desktop/mobile melengkapi evidence sebelum
  TODO ditandai selesai.

## 9. Release dan Readiness

Perubahan ini read-only dan tidak memengaruhi readiness, QA sign-off, atau keputusan rilis.
Rollback aplikasi cukup mengembalikan perilaku query/panel; tidak ada rollback database.

## 10. Traceability

`MY-TASKS-CREATED-BY-ME` → `TaskListQuerySchema` / `TaskListResponseSchema` → query Task
Workspace-scoped → hook dan panel My Tasks → tes PostgreSQL/API dan frontend → laporan task →
release aplikasi berikutnya.
