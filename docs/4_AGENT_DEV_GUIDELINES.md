# 4. Agent & Developer Guidelines — Qlick Hub SSoT

**Status:** Active Single Source of Truth (SSoT)  
**Scope:** Operating Guide for AI Agents and Developers, Definition of Done, Test Evidence & PostgreSQL Policy, and Reporting Standards.

---

## 1. Hirarki Kebenaran (_Source of Truth Hierarchy_)

```mermaid
graph LR
    User["1. Instruksi Langsung Pengguna"] --> Security["2. Batasan Keamanan (Security Constraints)"]
    Security --> Architecture["3. SSoT Architecture & Workflow\n(1_ARCHITECTURE.md & 2_WORKFLOW.md)"]
    Architecture --> UI["4. SSoT UI Design System\n(3_UI_ATOMIC_DESIGN_SYSTEM.md)"]
    UI --> Guidelines["5. SSoT Agent Dev Guidelines\n(4_AGENT_DEV_GUIDELINES.md)"]
    Guidelines --> Backlog["6. Active Backlog\n(TODO.md)"]

    classDef c1 fill:#FFE4E6,stroke:#E11D48,stroke-width:2px,color:#881337;
    classDef c2 fill:#FEE2E2,stroke:#EF4444,stroke-width:2px,color:#991B1B;
    classDef c3 fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef c4 fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;
    classDef c5 fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef c6 fill:#F1F5F9,stroke:#64748B,stroke-width:2px,color:#334155;

    class User c1;
    class Security c2;
    class Architecture c3;
    class UI c4;
    class Guidelines c5;
    class Backlog c6;
```

---

## 2. Siklus Hidup Pengerjaan Tugas (_8-Step Task Lifecycle_)

```mermaid
flowchart TD
    Step1["1. CLAIM\nUbah item di TODO.md menjadi 'In progress' + nama & tanggal"]
    Step2["2. UNDERSTAND\nPelajari dokumen SSoT & telusuri implementasi kode eksisting"]
    Step3["3. PLAN\nSusun rencana teknis, daftar berkas, dan strategi verifikasi"]
    Step4["4. IMPLEMENT ATOMICALLY\nBangun vertical slice terkecil & gunakan ulang komponen atomic"]
    Step5["5. VERIFY\nJalankan tes API/Web & buktikan migrasi PostgreSQL bersih"]
    Step6["6. REVIEW\nPastikan kelengkapan 5 state UI (loading, empty, error, disabled, auth)"]
    Step7["7. REPORT\nBuat laporan serah terima di docs/reports/ menggunakan template baku"]
    Step8["8. UPDATE TODO\nTandai 'Done' di TODO.md (atau 'Blocked' jika terhambat)"]

    Step1 --> Step2 --> Step3 --> Step4 --> Step5 --> Step6 --> Step7 --> Step8

    classDef phase fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;
    classDef done fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;

    class Step1,Step2,Step3,Step4,Step5,Step6,Step7 phase;
    class Step8 done;
```

---

## 3. Kebijakan Basis Data & Bukti Pengujian (_Database & Test Evidence_)

> [!CAUTION]
> **Larangan Data Tiruan (Mock Data) di Jalur Produksi:**
> Jalur eksekusi aplikasi dan validasi manual wajib menggunakan data persisten yang dikembalikan oleh backend terotentikasi. Dilarang keras menggunakan array hardcoded, browser-only state, fallback dummy data, atau fabricated URLs sebagai data produksi.

```mermaid
graph TD
    Start["Eksekusi Tes Integrasi Backend"] --> DBInit["1. Hubungkan ke Disposable PostgreSQL Test Database"]
    DBInit --> Migrate["2. Jalankan Seluruh Canonical Migrations (Clean Slate)"]
    Migrate --> Seed["3. Seed Contract-Valid Records via Factories"]
    Seed --> ExecuteAction["4. Eksekusi API Mutation / Service Endpoint"]
    ExecuteAction --> AssertPersisted["5. Assert Data Persisten di PostgreSQL + Audit Log"]

    AssertPersisted --> CheckResult{"Hasil Assertion?"}
    CheckResult -- "Pass" --> Green["Tes Lolos (Valid Test Evidence Tercatat)"]
    CheckResult -- "Fail" --> FixCode["Perbaiki Kode Implementasi (Dilarang Melemahkan/Menghapus Tes)"]
    FixCode --> ExecuteAction

    classDef step fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;
    classDef ok fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef fail fill:#FEE2E2,stroke:#EF4444,stroke-width:2px,color:#991B1B;

    class DBInit,Migrate,Seed,ExecuteAction,AssertPersisted step;
    class Green ok;
    class FixCode fail;
```

### A. Aturan Pengujian Integrasi Database PostgreSQL

- Pengujian integrasi API/database wajib menggunakan **PostgreSQL test database yang bersih (_disposable_)** dengan migrasi kanonikal yang diterapkan secara penuh.
- Fixture data hanya diizinkan di dalam kode bantuan pengujian (_test helper/factories_) dan harus memenuhi semua validasi foreign key database.
- **Mocking yang Diizinkan**: Hanya untuk layanan eksternal pihak ketiga (Firebase auth, Google Drive API, pengiriman email).
- **Mocking yang DILARANG**: Dilarang melakukan mock pada Sequelize model, query layer, otorisasi, migrasi, atau interface backend internal dalam tes integrasi.

### B. Larangan Melemahkan Tes (_Test Integrity_)

- Dilarang keras menghapus, men-skip (`test.skip`), atau mengubah ekspektasi tes yang gagal semata-mata agar build menjadi hijau (_green_).
- Perbaiki implementasi kode atau perbarui ekspektasi hanya jika ada perubahan kebijakan produk yang disetujui secara resmi.

---

## 4. Gerbang Definisi Selesai (_Definition of Done - DoD Gate_)

```mermaid
graph TD
    TaskSubmit["Penyelesaian Item Tugas di TODO.md"] --> C1{"1. Kriteria Penerimaan Sesuai?"}
    C1 -- "Ya" --> C2{"2. RBAC & Validasi API Ditegakkan?"}
    C1 -- "Tidak" --> Reject["Belum Selesai (Revisi Implementasi)"]

    C2 -- "Ya" --> C3{"3. UI Sesuai Stitch Tokens & WCAG AAA?"}
    C2 -- "Tidak" --> Reject

    C3 -- "Ya" --> C4{"4. Penanganan 5 State UI Lengkap?"}
    C3 -- "Tidak" --> Reject

    C4 -- "Ya" --> C5{"5. Persistensi PostgreSQL Terbukti Nyata?"}
    C4 -- "Tidak" --> Reject

    C5 -- "Ya" --> C6{"6. Seluruh Tes & Build Lolos (Exit 0)?"}
    C5 -- "Tidak" --> Reject

    C6 -- "Ya" --> C7{"7. Laporan di docs/reports/ Tersimpan?"}
    C6 -- "Tidak" --> Reject

    C7 -- "Ya" --> DoneMark["TANDAI SELESAI (DONE DI TODO.MD)"]
    C7 -- "Tidak" --> Reject

    classDef pass fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef fail fill:#FEE2E2,stroke:#EF4444,stroke-width:2px,color:#991B1B;
    classDef check fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;

    class DoneMark pass;
    class Reject fail;
    class C1,C2,C3,C4,C5,C6,C7 check;
```

---

## 5. Template Laporan Serah Terima (_Agent Report Template_)

Gunakan format baku berikut saat membuat laporan di `docs/reports/`:

```markdown
# [KODE_TASK] Laporan Eksekusi Fitur — YYYY-MM-DD

- **Pelaksana:** Nama Agen / Pengembang
- **Tanggal:** YYYY-MM-DD
- **Status:** Done / Blocked
- **Referensi Task:** TODO.md — [NAMA_TASK]

## 1. Ringkasan Perubahan

Jelaskan secara singkat apa yang diimplementasikan atau diperbaiki.

## 2. Berkas yang Diubah / Dibuat

- `[NEW/MODIFY]` path/to/file.ts
- `[NEW/MODIFY]` path/to/file.tsx

## 3. Bukti Verifikasi Pengujian (Test Evidence)

Cantumkan perintah pengujian yang dijalankan beserta hasilnya:

- **API Tests:** `npm run test:api` (XX passing, 0 failing)
- **Web Tests:** `npm run test:web` (XX passing, 0 failing)
- **Typecheck & Build:** `npm run typecheck` & `npm run build` (Exit 0)
- **Database Migrations:** Status migrasi PostgreSQL bersih.

## 4. Catatan Khusus & Handoff

Catatan penting untuk rilis, deployment, atau tugas lanjutan.
```
