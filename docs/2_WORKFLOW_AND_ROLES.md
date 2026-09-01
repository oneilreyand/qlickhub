# 2. Workflow & Role Governance — Qlick Hub SSoT

**Status:** Active Single Source of Truth (SSoT)  
**Scope:** End-to-End Delivery Flow, Role Responsibilities, Subtask Lifecycle, QA Native Testing, Bug Retesting, and Release Gates.

---

## 1. Alur Kerja Utama (_End-to-End Delivery Workflow_)

Alur kerja Qlick Hub mengintegrasikan seluruh peran dari tahap inisiasi kebutuhan hingga keputusan rilis formal:

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Owner / Admin
    actor PO as Product Owner (PO)
    actor Dev as Developer (FE/BE/Mobile)
    actor QA as QA Engineer

    Note over Owner,PO: Tahap 1: Setup & Perencanaan
    Owner->>PO: Siapkan Workspace & Konfigurasi Anggota
    PO->>PO: Susun Folder, Requirement (AC) & Feature Task
    PO->>Dev: Buat & Tugaskan Subtask (Delivery Area)
    PO->>QA: Buat & Tugaskan Subtask QA

    Note over Dev,QA: Tahap 2: Eksekusi & Persiapan Uji
    par Pengembangan Paralel
        Dev->>Dev: Pindahkan Subtask: todo → in_progress → in_review
    and Penyusunan Test Case
        QA->>QA: Buat Draft Test Case & Tautkan Requirement
        QA->>PO: Ajukan Test Case untuk Review
        PO->>QA: Terbitkan Test Case (Status: active)
    end

    Note over Dev,QA: Tahap 3: Eksekusi QA & Retest Loop
    QA->>QA: Jalankan Test Run pada Active Test Case
    alt Pengujian Gagal (Defect Terdeteksi)
        QA->>Dev: Catat First-Class Bug + Evidence Link
        Dev->>Dev: Perbaiki Bug & Tandai 'resolved'
        QA->>QA: Eksekusi Independent Retest & Close Bug
    else Pengujian Berhasil (Pass)
        QA->>QA: Rekam Immutable Test Result (passed)
    end

    Note over PO,QA: Tahap 4: Sign-off & Gerbang Rilis
    QA->>PO: Terbitkan QA Sign-off Form (Jaminan Kualitas)
    PO->>Owner: Evaluasi Snapshot Kesiapan Backend (Pass Rate %, Coverage %)
    PO->>PO: Terbitkan Release Decision (Approved / Rejected / Conditional)
    PO->>Owner: Tutup Parent Feature Task secara eksplisit
```

---

## 2. Matriks Tanggung Jawab & Batasan Peran (_Role Matrix_)

| Peran                  | Tanggung Jawab Utama                                                  | Aksi yang Diizinkan                                                                                                                    | Batasan Mutlak (_Hard Boundaries_)                                                                                                           |
| :--------------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner / Admin**      | Tata kelola workspace, konfigurasi anggota, dan persetujuan delivery. | Mengundang anggota, mengatur spesialisasi dev, delegasi parent task, rilis keputusan darurat.                                          | Dilarang memotong alur bukti pengujian QA untuk memaksakan rilis tanpa audit.                                                                |
| **Product Owner (PO)** | Pemilik cakupan fitur, prioritas requirement, dan keputusan rilis.    | Membuat Folder, Feature Task, Requirement, Subtask, mengaktifkan Test Case, menerbitkan _Release Decision_.                            | Dilarang mengubah status eksekusi _Test Result_ QA secara langsung.                                                                          |
| **Developer (`dev`)**  | Eksekusi teknis subtask sesuai spesialisasi.                          | Mengubah status subtask miliknya (`todo → in_progress → in_review`), memperbaiki Bug, mengunggah bukti teknis.                         | Dilarang merencanakan subtask baru, dilarang menutup Bug sendiri tanpa verifikasi QA, dilarang mengedit field planning (target date/points). |
| **QA (`qa`)**          | Menjamin kualitas, verifikasi requirement, dan mitigasi regresi.      | Membuat draf Test Case, mengimpor spreadsheet test case, menjalankan Test Run, mencatat Bug, mereview subtask, mengajukan QA Sign-off. | Dilarang mempublikasikan Test Case ke status `active` secara sepihak, dilarang mengambil keputusan rilis akhir PO.                           |

---

## 3. Spesialisasi Developer & Penugasan Subtask

Sesuai **ADR-002**, peran otorisasi sistem untuk developer tetap satu, yaitu `dev`, tetapi setiap anggota memiliki atribut **Spesialisasi Workspace** (_Workspace Specialty_):

- `frontend` — Antarmuka web, styling, interaksi browser.
- `backend` — API, skema database, integrasi sistem, performa query.
- `mobile` — Aplikasi iOS / Android.
- `fullstack` — Delivery menyeluruh lintas komponen.

```mermaid
graph LR
    Subtask["Subtask Delivery Area"] --> AreaMatch{"Validasi Spesialisasi Member"}

    AreaMatch -->|"Area: frontend"| DevFE["Developer: frontend / fullstack"]
    AreaMatch -->|"Area: backend"| DevBE["Developer: backend / fullstack"]
    AreaMatch -->|"Area: mobile"| DevMOB["Developer: mobile / fullstack"]
    AreaMatch -->|"Area: fullstack"| DevFS["Developer: fullstack"]
    AreaMatch -->|"Area: qa"| DevQA["Member Role: qa"]

    classDef valid fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    class DevFE,DevBE,DevMOB,DevFS,DevQA valid;
```

---

## 4. Siklus Hidup Subtask (_Subtask State Machine_)

```mermaid
stateDiagram-v2
    [*] --> todo: Dibuat oleh Planner (PO/Admin)

    todo --> in_progress: Developer mulai mengerjakan
    in_progress --> in_review: Developer submit review

    in_review --> changes_requested: QA / Reviewer menemukan revisi
    changes_requested --> in_progress: Developer memperbaiki revisi

    in_review --> completed: QA memverifikasi & lolos review
    completed --> [*]
```

### Aturan Transisi Subtask

1. **Developer Flow**: Developer menggerakkan subtask dari `todo → in_progress → in_review`.
2. **Review Independen**: Anggota QA atau sesama developer mereview pekerjaan. Jika belum lolos, status dialihkan ke `changes_requested`.
3. **Proteksi Field Perencanaan**: Field estimasi poin, tanggal target rilis, dan tautan Requirement hanya dapat diubah oleh Planner (`owner`, `admin`, `po`).

---

## 5. Manajemen Pengujian Native QA (_QA Test Management_)

### A. Siklus Hidup Test Case

```mermaid
stateDiagram-v2
    [*] --> draft: QA menyusun Test Case & memetakan Requirement
    draft --> in_review: QA mengajukan untuk persetujuan
    in_review --> active: PO / Admin mengaktifkan
    in_review --> draft: PO meminta revisi Test Case
    active --> archived: Test Case usang / tidak lagi relevan
    archived --> [*]
```

### B. Hasil Uji yang Imutabel (_Immutable Test Results_)

- Setiap eksekusi menghasilkan record `TestResult` yang append-only dengan status: `passed`, `failed`, `blocked`, atau `skipped`.
- Hasil uji historis **tidak pernah ditimpa** (_never overwritten_), sehingga rekam jejak regresi terjaga utuh.

### C. Alur Wizard Impor Spreadsheet (CSV / XLSX)

```mermaid
graph TD
    Upload["1. Upload Spreadsheet File (CSV / XLSX)"] --> Parse["2. Client/Server Parsing & Schema Check"]
    Parse --> HeaderMap["3. Header Mapping: Petakan Kolom Spreadsheet ke Field Test Case"]
    HeaderMap --> DryRun["4. Server Dry-Run & Validation Preview"]
    DryRun --> ValidationDecision{"Validasi Sukses?"}

    ValidationDecision -- "Gagal (Row Errors)" --> DownloadReport["Download Error Report & Perbaiki"]
    DownloadReport --> Upload

    ValidationDecision -- "Lolos" --> Commit["5. Commit Transactional Intake (create_only default)"]
    Commit --> DoneIntake["Test Cases Tersimpan di Database"]

    classDef step fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;
    classDef success fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef fail fill:#FEE2E2,stroke:#EF4444,stroke-width:2px,color:#991B1B;

    class Upload,Parse,HeaderMap,DryRun step;
    class Commit,DoneIntake success;
    class DownloadReport fail;
```

---

## 6. Siklus Defek & Retest (_Bug & Retest Lifecycle_)

```mermaid
graph TD
    TestFail["Test Result: Failed"] --> LogBug["QA: Log First-Class Bug + Evidence Link"]
    LogBug --> BugSeverity{"Tingkat Keparahan?"}

    BugSeverity -- "Critical / High" --> AlertPlanner["Notifikasi Langsung ke PO & Admin"]
    BugSeverity -- "Medium / Low" --> QueueBug["Tercatat pada Task Hub / Bug List"]

    AlertPlanner --> AssignFix["Assigned Developer: in_progress"]
    QueueBug --> AssignFix

    AssignFix --> DevResolve["Developer: Selesaikan Perbaikan & Mark 'resolved'"]
    DevResolve --> IndependentRetest["QA: Independent Retest Execution"]

    IndependentRetest --> RetestDecision{"Retest Lolos?"}
    RetestDecision -- "Ya (Pass)" --> CloseBug["Bug Status: CLOSED"]
    RetestDecision -- "Tidak (Fail)" --> ReopenBug["Kembali ke Developer: in_progress"]
    ReopenBug --> AssignFix

    classDef start fill:#FEE2E2,stroke:#EF4444,stroke-width:2px,color:#991B1B;
    classDef action fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;
    classDef done fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;

    class TestFail,LogBug start;
    class AssignFix,DevResolve,IndependentRetest,ReopenBug action;
    class CloseBug done;
```

---

## 7. Gerbang Kesiapan & Keputusan Rilis (_Release Readiness Gate_)

```mermaid
graph TD
    subgraph DataDerivation["1. Backend Readiness Derivation"]
        ReqCoverage["Requirement Coverage (% teruji)"]
        TestPassRate["Test Pass Rate (% sukses)"]
        OpenBugs["Zero Unresolved Critical/High Bugs"]
        ReqCoverage --> Calc["Backend Derived Readiness Snapshot"]
        TestPassRate --> Calc
        OpenBugs --> Calc
    end

    subgraph QASignoffBlock["2. QA Formal Sign-off"]
        Calc --> QAEval{"Kualitas Memenuhi Syarat?"}
        QAEval -- "Ya" --> QASubmit["QA Menerbitkan QA Sign-off"]
        QAEval -- "Tidak" --> QABlock["QA Menolak / Catat Rekomendasi Blokir"]
    end

    subgraph PODecisionBlock["3. PO Release Decision"]
        QASubmit --> POAction{"PO Release Decision"}
        POAction -->|"Approved"| RelApproved["Status: Approved for Production Deployment"]
        POAction -->|"Conditional"| RelConditional["Status: Approved with Documented Constraints"]
        POAction -->|"Rejected"| RelRejected["Status: Rejected (Remediation Needed)"]
    end

    RelApproved --> CloseParentTask["Planner Menutup Parent Feature Task"]

    classDef pass fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef warn fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef fail fill:#FEE2E2,stroke:#EF4444,stroke-width:2px,color:#991B1B;

    class RelApproved,CloseParentTask pass;
    class RelConditional warn;
    class RelRejected,QABlock fail;
```
