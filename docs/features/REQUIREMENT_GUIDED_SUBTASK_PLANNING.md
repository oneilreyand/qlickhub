# REQUIREMENT-GUIDED-SUBTASK-PLANNING Requirement-Guided Subtask Planning

**Status:** Active  
**Owner:** Product and Engineering  
**Last reviewed:** 2026-09-11  
**Applicable Policy IDs:** `DOMAIN-002`, `DOMAIN-004`, `AUTH-002`, `FLOW-002`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Fitur ini memberi Owner, Admin, dan Product Owner jalur eksplisit dari pembuatan Requirement di
Feature menuju perencanaan Subtask yang mengimplementasikannya. Requirement tetap merupakan
rekaman Workspace yang dapat digunakan ulang, sedangkan Subtask tetap merupakan unit eksekusi
langsung di bawah root Task/Feature. Fitur tidak membuat Subtask secara otomatis dan tidak
mengubah penugasan Test Case yang tetap dikelola melalui QA Testing Desk.

## 2. Requirement dan Acceptance Criteria

- **RGS_REQ_001:** Planner dapat menyimpan Requirement saja atau memilih `Create & Plan Subtask`.
- **RGS_REQ_002:** Setelah jalur kedua dipilih, Requirement baru harus sudah persisten dan tertaut
  ke Feature sebelum form Subtask dibuka.
- **RGS_REQ_003:** Form Subtask hanya menawarkan Requirement aktif yang sudah tertaut ke parent
  Feature dan mendukung pilihan lebih dari satu Requirement.
- **RGS_REQ_004:** Pembuatan Subtask menyimpan seluruh link Requirement dan Activity audit dalam
  transaksi yang sama dengan Subtask.
- **RGS_AC_001:** `Create Requirement` tidak membuka atau membuat Subtask.
- **RGS_AC_002:** `Create & Plan Subtask` membuka form Subtask dengan Requirement baru terpilih.
- **RGS_AC_003:** API menolak Requirement yang nonaktif, berbeda Workspace, atau tidak tertaut ke
  parent Feature, dan tidak meninggalkan Subtask parsial.
- **RGS_AC_004:** Subtask yang valid memiliki baris `task_requirements` dan Activity
  `requirement_linked` untuk setiap Requirement terpilih.

Keputusan berasal dari model dan workflow kanonis pada `docs/1_ARCHITECTURE.md` dan
`docs/2_WORKFLOW_AND_ROLES.md`; kartu ini tidak mengubah kebijakan global tersebut.

## 3. Alur Lintas Peran

1. Owner/Admin/PO membuka tab Requirements pada root Feature dan membuat Requirement.
2. Planner memilih menyimpan saja atau menyimpan lalu merencanakan Subtask.
3. Pada jalur perencanaan, aplikasi membuat Requirement, menautkannya ke Feature, lalu membuka
   form Subtask dengan Requirement tersebut terpilih.
4. Planner dapat menambah atau menghapus pilihan Requirement aktif lain yang sudah tertaut ke
   Feature, memilih delivery area dan assignee, lalu membuat Subtask.
5. Developer atau QA menerima Subtask sesuai delivery area dan mengerjakannya melalui lifecycle
   Subtask yang sudah ada. QA tetap menghubungkan Test Case ke Requirement lewat QA Testing Desk.
6. Jika pembuatan atau penautan Requirement gagal, form tetap menampilkan error dan form Subtask
   tidak dibuka. Jika pembuatan Subtask gagal, tidak ada Subtask atau link parsial yang tersimpan.

## 4. Data dan Relasi

Relasi tetap `Workspace → Feature/root Task → Subtask` dan `Requirement ↔ Task/Subtask` melalui
`task_requirements`. Input pembuatan Subtask menambah daftar ID Requirement, tetapi tidak menambah
entitas atau kolom baru. Backend membaca Requirement aktif dalam Workspace, memverifikasi link ke
parent Feature, lalu menyimpan Subtask, link, `subtask.created`, dan `requirement_linked` secara
transaksional. Tidak ada migrasi atau backfill; Subtask lama tetap valid tanpa link Requirement.

## 5. API dan Shared Contract

Endpoint yang berubah secara aditif adalah
`POST /workspaces/:workspaceId/tasks/:taskId/subtasks`. `CreateTaskSchema` di
`packages/contracts/src/task.ts` menerima `requirementIds?: UUID[]` yang unik, maksimal 100, dan
hanya sah saat `parentTaskId` tersedia. Respons Task tidak berubah.

Error `400 BAD_REQUEST` diberikan jika pilihan berisi Requirement nonaktif, berbeda Workspace,
tidak tertaut ke parent Feature, atau digunakan untuk root Task. Otorisasi yang tidak memenuhi
role Planner tetap menghasilkan error forbidden dari policy Task yang sudah ada.

## 6. Authorization

Sesuai `AUTH-002` dan `FLOW-002`, hanya membership aktif dengan role `owner`, `admin`, atau `po`
yang dapat membuat Requirement, menautkannya, dan merencanakan Subtask. UI menyembunyikan aksi
untuk role lain, tetapi backend route, Task policy, validasi Workspace, dan validasi relasi parent
menjadi enforcement otoritatif. Developer dan QA tetap dapat membaca Requirement sesuai konteks
Task tanpa mendapatkan hak mutasi baru.

## 7. UI dan Interaction States

Alur berada di Task Detail drawer, tab Requirements, dan memakai komponen Atomic Design yang
sudah ada: `RequirementFormModal`, `Modal`, `Button`, `CreateSubtaskModal`, `Checkbox`, `Alert`,
dan `Skeleton`. Pada root Feature, modal Requirement menampilkan `Create Requirement` serta
`Create & Plan Subtask`; mode edit dan konteks Subtask tidak menampilkan aksi perencanaan lanjutan.

Form Subtask menampilkan daftar checkbox yang dapat digunakan dengan keyboard dan label gabungan
kode/judul. Loading memakai Skeleton, kegagalan menyediakan Alert dan Retry, kondisi tanpa link
menampilkan empty state, dan permission-denied tidak merender modal. Layout memakai stack pada
mobile dan batas tinggi bergulir untuk daftar Requirement agar tetap dapat digunakan pada desktop
dan mobile.

## 8. Pengujian dan Evidence

- Contract test membuktikan ID unik, batas Subtask-only, dan parsing lebih dari satu Requirement.
- PostgreSQL integration test membuat data kanonis, membaca kembali link dan Activity, serta
  membuktikan rollback ketika Requirement tidak tertaut ke parent Feature.
- Frontend interaction test membuktikan dua aksi Requirement, urutan create → link → plan,
  preselection, pemilihan Requirement, dan payload Subtask.
- Typecheck, full frontend/API suites, production build, documentation check, dan visual check
  desktop/mobile dicatat di laporan penyelesaian setelah benar-benar dijalankan.

## 9. Release dan Readiness

Perubahan bersifat backward-compatible dan tidak memerlukan migrasi. Release harus menempatkan
shared contract dan API sebelum atau bersamaan dengan frontend. Rollback aplikasi dapat dilakukan
tanpa rollback data karena baris `task_requirements` memakai relasi kanonis yang sudah ada.
Perubahan ini belum merupakan Production deployment dan tidak mengubah QA sign-off atau PO
release-decision gate.

## 10. Traceability

`RGS_REQ_001..004` → `RGS_AC_001..004` → Task Detail Requirements → `CreateTaskSchema` →
`taskLifecycle.createTaskImpl` → `tasks` + `task_requirements` + `task_activity` → focused contract,
PostgreSQL, dan frontend tests →
`docs/reports/REQUIREMENT_GUIDED_SUBTASK_PLANNING_2026-09-11.md`. Test Case/Test Result, Bug/retest,
QA sign-off, dan release decision tetap menggunakan traceability kanonis serta Delivery Trace yang
sudah ada.
