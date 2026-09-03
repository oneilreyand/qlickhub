# 1. Architecture & Technical Foundation — Qlick Hub SSoT

**Status:** Active Single Source of Truth (SSoT)  
**Scope:** Domain Model, Hierarchy, Authorization (RBAC), Data Schema, and Security Architecture.

---

## 1. Product Vision & Overview

**Qlick Hub** adalah platform kolaborasi pengiriman perangkat lunak berbasis _QA-Native Work Hub_. Platform ini menghubungkan Product Owner (PO), Developer (Frontend, Backend, Mobile, Fullstack), dan Quality Assurance (QA) dalam satu alur kerja terpadu untuk orkestrasi tugas, pelacakan kebutuhan (_requirement traceability_), eksekusi pengujian (_test execution_), hingga keputusan rilis (_release decision_).

### Pertanyaan Kunci yang Dijawab Work Hub

Tanpa berpindah halaman, setiap anggota tim dapat menjawab 3 pertanyaan fundamental:

1. **Apa yang sedang kita kirimkan?** (_What are we delivering?_)
2. **Kebutuhan & dokumen mana yang mendefinisikannya?** (_Which requirement & document define it?_)
3. **Apakah QA telah membuktikan kesiapannya?** (_Has QA proved it is ready?_)

---

## 2. Diagram Arsitektur Sistem & Batasan Keamanan

```mermaid
graph TB
    subgraph Client["Frontend Client (apps/web)"]
        UI["React 18 + Vite + Tailwind CSS"]
        State["Redux Toolkit / Thunk Store"]
        UI --> State
    end

    subgraph ContractBoundary["API Contract Boundary (packages/contracts)"]
        Contracts["TypeScript Interfaces, DTOs & Validation Schemas"]
    end

    subgraph Server["Backend API (apps/api)"]
        Router["Express API Router (/v1)"]
        AuthMiddleware["Workspace Auth & RBAC Policy Guards"]
        Controllers["Module Controllers"]
        Services["Business Domain & Policy Services"]
        SequelizeORM["Sequelize ORM Models & Migrations"]

        Router --> AuthMiddleware
        AuthMiddleware --> Controllers
        Controllers --> Services
        Services --> SequelizeORM
    end

    subgraph DataStorage["Data & Storage Infrastructure"]
        Postgres[("PostgreSQL Database\n(39 Canonical Tables)")]
        GDrive[("Google Drive Connector\n(Encrypted Attachments)")]
    end

    Client <== "Authenticated REST JSON" ==> Router
    Client -. "Consumes Shared Types" .-> ContractBoundary
    Server -. "Implements & Validates" .-> ContractBoundary
    SequelizeORM <== "Transactional SQL" ==> Postgres
    Services <== "Server-Side Service Account" ==> GDrive

    classDef client fill:#E2F8CB,stroke:#84CC16,stroke-width:2px,color:#141413;
    classDef server fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;
    classDef db fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef boundary fill:#F1F5F9,stroke:#64748B,stroke-width:2px,stroke-dasharray: 5 5,color:#334155;

    class UI,State client;
    class Router,AuthMiddleware,Controllers,Services,SequelizeORM server;
    class Postgres,GDrive db;
    class ContractBoundary,Contracts boundary;
```

---

## 3. Glosarium Domain & Terminologi Resmi

| Istilah Resmi                   | Definisi                                                                                                                              | Istilah yang Harus Dihindari        |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------- |
| **Workspace**                   | Ruang kerja proyek terisolasi yang diakses pengguna yang terautentikasi, menaungi seluruh folder, task, requirement, dan anggota tim. | _tenant, board, project container_  |
| **Project Member**              | Pengguna yang terdaftar dalam satu Workspace dengan peran tertentu (`owner`, `admin`, `po`, `dev`, `qa`).                             | _collaborator, participant, guest_  |
| **Folder & Subfolder**          | Struktur pengelompokan hierarkis di dalam Workspace (maksimal kedalaman 2 level).                                                     | _category, group, directory_        |
| **Feature / Story (Root Task)** | Task tingkat atas di dalam folder yang menjadi kontainer utama pengiriman fitur.                                                      | _epic table, feature record_        |
| **Subtask**                     | Unit eksekusi turunan langsung dari Root Task untuk delivery spesifik (Frontend, Backend, Mobile, Fullstack, atau QA).                | _child task, nested task_           |
| **Requirement**                 | Definisi spesifikasi kebutuhan berskala Workspace yang dapat dihubungkan ke banyak task (_many-to-many_).                             | _spec item, task requirement_       |
| **Acceptance Criteria**         | Kriteria penerimaan yang terdefinisi di bawah Requirement dengan identitas UUID stabil.                                               | _checklist item, acceptance bullet_ |
| **Evidence**                    | Bukti pengujian terotentikasi dan persisten (tangkapan layar, rekaman video, log) yang diunggah ke storage atau ditautkan via HTTPS.  | _proof, attachment link_            |

---

## 4. Diagram Relasi Entitas & Hierarki Data

```mermaid
erDiagram
    WORKSPACE ||--o{ FOLDER : "contains (max depth 2)"
    WORKSPACE ||--o{ PROJECT_MEMBER : "has members"
    WORKSPACE ||--o{ REQUIREMENT : "owns"

    FOLDER ||--o{ TASK : "groups (Feature/Story)"

    REQUIREMENT ||--o{ ACCEPTANCE_CRITERIA : "defines"
    REQUIREMENT ||--o{ TASK_REQUIREMENT : "links"
    TASK ||--o{ TASK_REQUIREMENT : "linked to"

    TASK ||--o{ SUBTASK : "divides into (1 level: Dev/QA)"
    TASK ||--o{ TASK_ATTACHMENT : "stores evidence"
    TASK ||--o{ QA_DOCUMENT : "references"
    TASK ||--o{ QA_SIGNOFF : "validated by"
    TASK ||--o{ RELEASE_DECISION : "gated by"

    TASK ||--o{ TEST_CASE : "covered by"
    TEST_CASE ||--o{ TEST_RUN : "executed in"
    TEST_RUN ||--o{ TEST_RESULT : "produces (immutable)"

    TEST_RESULT ||--o{ BUG : "triggers on failure"
    SUBTASK ||--o{ BUG : "assigned for fix"
    BUG ||--o{ BUG_ACTIVITY : "audit log"
```

### Aturan Hierarki Data

1. **Folder Depth**: Maksimal 2 level folder di dalam Workspace (`Folder → Subfolder`).
2. **Task Nesting**: Hanya 1 tingkat subtask langsung di bawah Root Task. Dilarang arbitrer subtask bertingkat (_nested subtasks of subtasks_).
3. **Requirement Ownership**: Requirement dimiliki pada tingkat Workspace dan dihubungkan ke parent Task via `task_requirements` (_many-to-many_).

---

## 5. Model Keamanan & Otorisasi (RBAC)

```mermaid
graph TD
    User["Authenticated User"] --> MemberCheck{"Has Active Workspace Membership?"}
    MemberCheck -- "No" --> Deny403["403 Forbidden / 401 Unauthorized"]

    MemberCheck -- "Yes" --> RoleRouter{"Identify Member Role"}

    RoleRouter -->|"owner / admin"| FullControl["Full Workspace Control\n- Manage Members & Dev Specialties\n- Plan Folders, Tasks, Subtasks\n- Grant Parent-Task Delegations\n- Approve / Reject Releases"]
    RoleRouter -->|"po (Product Owner)"| POControl["Feature & Quality Planning\n- Manage Requirements & Folders\n- Plan Tasks & Subtasks\n- Activate Test Cases\n- Formal Release Decisions"]
    RoleRouter -->|"dev (Developer)"| DevControl["Delivery Execution\n- Execute Assigned Subtask (todo → in_review)\n- Resolve Bugs\n- Upload Tech Evidence\n- (Parent Task creation ONLY if delegated)"]
    RoleRouter -->|"qa (Quality Assurance)"| QAControl["Quality & Test Assurance\n- Author Draft Test Cases\n- Execute Test Runs & Immutable Results\n- Log Bugs & Retest Verification\n- Submit QA Sign-offs"]

    classDef deny fill:#FEE2E2,stroke:#EF4444,stroke-width:2px,color:#991B1B;
    classDef owner fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef po fill:#E0E7FF,stroke:#4F46E5,stroke-width:2px,color:#312E81;
    classDef dev fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef qa fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;

    class Deny403 deny;
    class FullControl owner;
    class POControl po;
    class DevControl dev;
    class QAControl qa;
```

### Aturan Delegasi Pembuatan Task

- `owner` atau `admin` dapat memberikan delegasi izin pembuatan parent-Task yang bersifat aktif dan berbatas waktu (_expiring delegation_) kepada anggota `dev` atau `qa`.
- **Batasan Mutlak**: Delegasi izin ini **hanya** berlaku untuk parent-Task dan **tidak pernah** mengizinkan perencanaan subtask.

### Perlindungan Link Preview Terdistribusi

- Endpoint `GET /v1/meta/link-preview` tetap terotentikasi dan dibatasi **30 request per 60 detik per pengguna**. Alamat IP hanya menjadi fallback ketika identitas pengguna tidak tersedia.
- Production dan Preview Vercel memakai satu Upstash Redis single-region melalui REST sebagai counter store bersama dengan algoritma sliding window. Batas tersebut berlaku lintas instance serverless; memory store per proses bukan sumber enforcement Production.
- Identifier counter disamarkan menggunakan HMAC dan secret backend khusus. UUID pengguna, alamat IP mentah, URL target, credential, dan secret tidak boleh disimpan sebagai Redis key atau dikirim ke browser.
- Konfigurasi Upstash dan secret identifier wajib tersedia pada runtime Production/Preview. Konfigurasi yang hilang harus menggagalkan startup agar deployment tidak diam-diam kembali ke limiter per-instance.
- Gangguan sementara atau timeout Upstash memakai fallback limiter memory lokal untuk menjaga ketersediaan, disertai warning tersanitasi. Selama degradasi ini perlindungan per-instance tetap aktif, tetapi konsistensi global tidak diklaim.
- Respons penolakan tetap `429` dengan kode `RATE_LIMITED` dan header rate-limit standar. Analytics provider tidak diaktifkan untuk slice ini.
- Vercel WAF dapat ditambahkan sebagai pertahanan IP di edge, tetapi tidak menggantikan enforcement per pengguna ini. Keputusan lengkap tercatat di [ADR-003](adr/ADR-003-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT.md).

---

## 6. Arsitektur Teknis & Database

### A. Teknologi Inti

- **Frontend (`apps/web`)**: React 18+, Vite, React Router, Redux Toolkit, Redux Thunk, Tailwind CSS.
- **Backend (`apps/api`)**: Node.js, Express, TypeScript, Sequelize ORM, PostgreSQL.
- **Shared Contracts (`packages/contracts`)**: Satu-satunya jembatan tipe & kontrak API antara frontend dan backend.

### B. Prinsip Database & Mutasi Data

1. **PostgreSQL Default**: Seluruh data persisten dikelola via Sequelize dengan relasi formal dan foreign key. Raw SQL berparameter hanya digunakan untuk kebutuhan PostgreSQL-spesifik (`pgvector`, indeks khusus, analitik).
2. **Kanonikal Migrasi**: Setiap perubahan skema tabel wajib melalui file migrasi Sequelize di `apps/api/src/database/migrations/`.
3. **Transaksi & Audit**: Semua mutasi data jamak (_multi-record writes_) wajib dibungkus dalam `sequelize.transaction()` dan mencatat riwayat ke tabel audit/aktivitas Workspace.

### C. Penyimpanan Berkas & Bukti (_Evidence Storage_)

- Dokumen dan file evidence disimpan secara persisten dengan relasi tabel `task_attachments`.
- Berkas fisik diunggah melalui server-side Google Drive connector yang aman.
- Pengunduhan dan preview berkas diakses melalui endpoint aplikasi terotentikasi atau URL berbatas waktu pendek (_short-lived signed URL_).
- Kredensial service account Google Drive, JWT secrets, dan `DATABASE_URL` **tidak boleh** diekspos ke browser.

### D. Batasan Tata Kelola AI (_AI Governance_)

- Setiap kapabilitas AI hanya menghasilkan draf usulan (_cited draft_).
- AI **dilarang keras** melakukan mutasi data produksi secara otomatis/otonom tanpa tindakan eksplisit (_Apply action_) dari pengguna yang terautentikasi.
