# ADR-016: Workload Conflict and Cross-Workspace Privacy Boundary

**Status:** Accepted  
**Date:** 2026-09-25  
**Decision owner:** Product and Engineering  
**Implementation stakeholders:** Product Owner, Backend, Frontend, and QA  

## Context

Ketika Product Owner, Workspace Admin, atau Owner merencanakan Subtask dan menetapkan anggota tim (Developer atau QA) dengan tanggal mulai dan tenggat tertentu, mereka membutuhkan visibilitas mengenai beban kerja aktif orang tersebut agar tidak terjadi kelebihan beban atau bentrokan jadwal yang tidak disadari.

Namun, anggota tim dapat tergabung dalam beberapa Workspace sekaligus. Memberikan visibilitas langsung atas pekerjaan di Workspace lain berisiko membocorkan rahasia proyek (nama task, nama workspace lain, deskripsi, link attachment) kepada pihak yang tidak memiliki hak akses di Workspace tersebut (melanggar prinsip isolasi data Workspace `AUTH-001`).

Selain itu, perencanaan tugas di Qlick Hub menganut prinsip kendali manusia: sistem bertindak sebagai penasihat (_advisory_), bukan pembuat keputusan otomatis. Penugasan tidak boleh memblokir submission, melakukan auto-reassign, atau mendegradasi prioritas secara otomatis.

## Decision

1. **Advisory Assignment Conflict Detection (`FLOW-007`)**:
   - Deteksi irisan jadwal dihitung secara inklusif di backend PostgreSQL dengan rumus:
     `existing.startDate <= candidate.dueDate && existing.dueDate >= candidate.startDate`.
   - Hanya Subtask aktif yang dievaluasi (`todo`, `in_progress`, `in_review`, `changes_requested`). Status terminal (`done`, `canceled`) diabaikan.
   - Subtask aktif tanpa jadwal (`startDate` atau `dueDate` bernilai null) tidak dihitung sebagai konflik irisan tanggal, melainkan dilaporkan sebagai status informatif: *"beban aktif tanpa jadwal; irisan waktu tidak dapat dinilai"*.
   - Saat mengedit Subtask eksisting, jadwal Subtask itu sendiri dikecualikan dari perhitungan irisan (`excludeSubtaskId`).
   - Sifat peringatan adalah **murni advisory**: form dan API create/update Subtask tidak pernah memblokir penyimpanan, tidak melakukan reassign otomatis, dan tidak mengubah prioritas.

2. **Cross-Workspace Privacy Boundary (`AUTH-011`)**:
   - Jika konflik jadwal berasal dari Workspace aktif, detail lengkap ditampilkan (judul subtask, delivery area, status, tanggal mulai/tenggat).
   - Jika konflik jadwal berasal dari Workspace lain:
     - Apabila aktor pemanggil memiliki keanggotaan terautentikasi aktif di Workspace asal tersebut, detail dapat ditampilkan.
     - Apabila aktor pemanggil **bukan** anggota di Workspace asal tersebut, informasi **wajib disamarkan (redacted)** secara ketat: backend hanya menyajikan jumlah konflik dan rentang tanggal jadwal (`startDate` dan `dueDate`). Judul task, nama Workspace, deskripsi, komentar, dan tautan dilarang keras dibocorkan dalam respons API.

3. **RBAC & Planning Boundary**:
   - Hak memanggil preview konflik penugasan (`POST /v1/workspaces/:workspaceId/capacity/assignment-preview`) dibatasi hanya untuk perencana (`owner`, `admin`, `po`). Role Developer dan QA ditolak dengan `403 Forbidden` (`AUTH-002`, `FLOW-002`, `AUTH-004`).
   - Seluruh anggota aktif Workspace berhak membaca Timeline Tim (`GET /v1/workspaces/:workspaceId/capacity/timeline`).

4. **Repurposing `/reports`**:
   - Halaman `/reports` dikosongkan dari agregasi analitik lama dan dialihkan sepenuhnya menjadi antarmuka visual **Timeline Tim**. Komponen `TaskReportDashboard` lama tetap dipertahankan di codebase sebagai komponen terisolasi agar tidak merusak ketergantungan lain yang mungkin ada.

## Consequences

- Backend bertanggung jawab penuh atas semua perhitungan beban kerja dan logika irisan tanggal; antarmuka React hanya menampilkan data yang diterima dari backend (`DATA-001`).
- Endpoint baru di bawah `/v1/workspaces/:workspaceId/capacity` menyediakan kontrak terdefinisi di `packages/contracts`.
- Ditambahkan indeks komposit additive pada tabel `tasks` (`assignee_id`, `status`, `start_date`, `due_date`) untuk memastikan performa query kapasitas tetap optimal tanpa sequential scan.
- Hak privasi lintas Workspace terjaga dengan baik tanpa mengorbankan kesadaran kapasitas perencana proyek.

## Alternatives considered

- **Memblokir penugasan jika jadwal bentrok:** Ditolak karena mengganggu fleksibilitas perencana (misal: developer hanya butuh beberapa jam untuk task kecil, atau tim sengaja melakukan pair-programming).
- **Menampilkan judul task lintas workspace secara terbuka:** Ditolak keras karena melanggar batasan kerahasiaan multi-tenant/multi-workspace.
- **Menghitung overlap di browser (React):** Ditolak karena melanggar `DATA-001` dan `AUTH-002`, serta memerlukan pengiriman seluruh data mentah semua task ke browser.
