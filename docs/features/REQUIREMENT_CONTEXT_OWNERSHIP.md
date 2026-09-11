# Requirement Context Ownership

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-10
**Applicable Policy IDs:** `DOMAIN-003`, `DOMAIN-004`, `AUTH-002`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-004`

## 1. Tujuan dan Pengguna

Memberi Product Owner satu tempat yang jelas untuk mendefinisikan konteks dan batas Feature tanpa
menggandakan Requirement yang dipakai Developer dan QA. Product Brief menyimpan konteks Feature,
referensi eksternal, In Scope, dan Out of Scope. Requirement menyimpan kebutuhan yang dapat
ditelusuri serta Acceptance Criteria yang stabil dan dapat diuji.

Slice ini tidak mengubah readiness gate atau memaksa Requirement lama berstatus `active` memiliki
Acceptance Criteria. Gate tersebut memerlukan audit data persisten dan keputusan remediasi
terpisah agar status historis tidak berubah diam-diam.

## 2. Requirement dan Acceptance Criteria

- Planner dapat membuka Product Brief terpisah dari tab Requirements, memperbarui konteks Markdown
  termasuk tautan PRD/Figma/spec eksternal, serta mengelola In Scope dan Out of Scope.
- Planner dapat melihat, membuat, mengubah, menonaktifkan, dan mengaktifkan kembali Acceptance
  Criteria beridentitas stabil di bawah Requirement.
- Developer dan QA dapat membaca Product Brief, Requirements, dan Acceptance Criteria, tetapi tidak
  mendapat kontrol mutasi.
- Requirement menampilkan URL opsional sebagai `Source / Reference`, yaitu sumber yang spesifik
  terhadap Requirement. Referensi Feature yang umum tidak perlu diulang pada setiap Requirement.
- Loading, empty, error, saving, dan read-only state tetap eksplisit pada kedua tab.

## 3. Alur Lintas Peran

1. PO/Owner/Admin membuat atau memperbarui Product Brief pada Feature dan menyimpan versi baru.
2. PO/Owner/Admin menghubungkan Requirement Workspace ke Feature lalu mendefinisikan Acceptance
   Criteria pada setiap Requirement.
3. Developer membaca Product Brief sebagai batas delivery dan Requirement/Acceptance Criteria
   sebagai hasil yang harus diimplementasikan.
4. QA membaca Requirement/Acceptance Criteria untuk menyusun Test Case; pemetaan coverage resmi
   tetap pada tingkat Requirement sesuai keputusan domain saat ini.

## 4. Data dan Relasi

Tidak ada entitas atau migrasi baru. Product Brief tetap memakai `qa_documents`,
`qa_document_versions`, dan link `primary_prd` ke Task. In Scope dan Out of Scope tetap menjadi
snapshot versi Product Brief. Acceptance Criteria tetap berada di `acceptance_criteria` dan dimiliki
oleh Requirement dalam Workspace yang sama.

Acceptance Criteria lama yang tersimpan pada versi Product Brief dipertahankan sebagai histori dan
diteruskan tanpa perubahan saat menyimpan versi baru, tetapi tidak ditampilkan sebagai sumber
Acceptance Criteria kanonikal.

## 5. API dan Shared Contract

Slice memakai interface yang sudah ada:

- `GET/PUT /workspaces/:workspaceId/tasks/:taskId/product-brief`
- `GET /workspaces/:workspaceId/requirements/:requirementId`
- `POST /workspaces/:workspaceId/requirements/:requirementId/acceptance-criteria`
- `PATCH /workspaces/:workspaceId/requirements/:requirementId/acceptance-criteria/:criterionId`

Tidak ada perubahan bentuk request/response bersama.

## 6. Authorization

Product Brief dan Requirement/Acceptance Criteria hanya dapat dimutasi Planner
(`owner`, `admin`, `po`). Semua Project Member aktif dapat membaca dalam Workspace yang sama.
Backend policy/service tetap menjadi otoritas; visibilitas kontrol pada UI bukan authorization.

## 7. UI dan Interaction States

Task Detail menyediakan tab `Product Brief` dan `Requirements` yang terpisah. Product Brief
menggunakan komponen Atomic Design yang sudah ada untuk judul, status, rich text, scope item,
alert, dan aksi simpan. Requirements memakai `RequirementManager`; detail Requirement menampilkan
Acceptance Criteria dan kontrol planner yang sesuai.

Kedua permukaan harus tetap dapat digunakan pada desktop dan mobile, memiliki accessible name,
minimum touch target, serta loading, empty, error, saving, disabled, dan read-only state yang jelas.

## 8. Pengujian dan Evidence

- Test frontend membuktikan pemisahan tab, Product Brief scope/version save, tampilan read-only,
  serta Acceptance Criteria create/update/status behavior.
- Contract test dan PostgreSQL integration Requirement/Product Brief yang sudah ada dijalankan untuk
  membuktikan persistensi, Workspace integrity, backend authorization, dan activity audit.
- Typecheck, production build, documentation check, dan desktop/mobile visual review dijalankan
  sebelum item dinyatakan selesai.

## 9. Release dan Readiness

Tidak ada perubahan release-readiness calculation, Requirement coverage, QA Sign-off, atau Release
Decision. Requirement tetap menjadi target coverage kanonikal; Acceptance Criteria tetap detail
stabil di bawahnya.

## 10. Traceability

Product Brief scope/reference → Feature Task → Requirement → Acceptance Criteria → Task/Subtask →
Test Case/Test Result → Bug/retest → QA Sign-off → Release Decision.
