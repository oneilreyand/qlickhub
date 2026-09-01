# 3. UI & Atomic Design System — Qlick Hub SSoT

**Status:** Active Single Source of Truth (SSoT)  
**Scope:** Information Architecture, Navigation Routes, Stitch Design Tokens, Atomic Component Catalog (`apps/web/src/components/ui/`), and Accessibility Standards.

---

## 1. Arsitektur Hirarki Atomic Design

Pengembangan antarmuka di `apps/web/` mengadopsi hierarki **Atomic Design** yang terstruktur dari unit terkecil hingga halaman utuh:

```mermaid
graph BT
    subgraph AtomsLayer["1. ATOMS (Primitif & Indivisible)"]
        Button["Button / IconButton"]
        Input["Input / Textarea / Select / Checkbox"]
        Badge["Badge / Avatar / Tooltip"]
        Feedback["LoadingSpinner / ProgressBar / Skeleton / Alert"]
        Card["Card / Accordion / FormattedText"]
    end

    subgraph MoleculesLayer["2. MOLECULES (Pola Interaksi Kombinasi)"]
        StatusBadges["TaskStatusBadge / BugStatusBadge / ReadinessSignal"]
        FormControls["DateRangePicker / SearchInput / RichTextEditor"]
        Overlays["Modal / Drawer / Snackbar / Lightbox"]
        CollabWidgets["SubtaskRoleTimeline / TaskCommentBox / Breadcrumb"]
    end

    subgraph OrganismsLayer["3. ORGANISMS (Modul Fitur Kompleks)"]
        WorkHubOrg["FolderTree / TaskCollection / TaskTimelineView / TaskDetailDrawer"]
        QAOrg["QaTraceabilityMatrix / ReleaseAssurancePanel / BugExperiencePanel"]
        DesksOrg["MyTasksDashboard / QaTestingDesk / DevWorkingDesk / IntakeWizard"]
        SettingsOrg["WorkspaceMembersTable / WorkspaceTaskPolicyCard"]
    end

    subgraph TemplatesLayer["4. TEMPLATES & LAYOUTS"]
        AppLayout["AppLayout (Header + Sidebar Navy + Main Content)"]
        WorkHubTemplate["TaskHubDashboardTemplate (3-Panel Grid)"]
    end

    subgraph PagesLayer["5. PAGES & ROUTES"]
        WorkHubPage["/work (WorkHubPage)"]
        MyTasksPage["/my-tasks (MyTasksPage)"]
        ReportPage["/reports (ReportPage)"]
        SettingsPage["/workspaces/settings (WorkspaceSettingsPage)"]
        GalleryPage["/components (ComponentGalleryPage)"]
    end

    AtomsLayer --> MoleculesLayer
    MoleculesLayer --> OrganismsLayer
    OrganismsLayer --> TemplatesLayer
    TemplatesLayer --> PagesLayer

    classDef atom fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef molecule fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef organism fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;
    classDef template fill:#F3E8FF,stroke:#9333EA,stroke-width:2px,color:#581C87;
    classDef page fill:#FFE4E6,stroke:#E11D48,stroke-width:2px,color:#881337;

    class AtomsLayer,Button,Input,Badge,Feedback,Card atom;
    class MoleculesLayer,StatusBadges,FormControls,Overlays,CollabWidgets molecule;
    class OrganismsLayer,WorkHubOrg,QAOrg,DesksOrg,SettingsOrg organism;
    class TemplatesLayer,AppLayout,WorkHubTemplate template;
    class PagesLayer,WorkHubPage,MyTasksPage,ReportPage,SettingsPage,GalleryPage page;
```

---

## 2. Blueprint Tata Letak Antarmuka (3-Panel Grid Layout)

```mermaid
graph TD
    subgraph AppShell["AppLayout Shell (apps/web/src/components/layout/)"]
        HeaderBlock["Header: Workspace Selector · Global Search · Notifications · User Profile"]

        subgraph BodyGrid["3-Panel Desktop Grid Layout (/work)"]
            LeftPanel["Panel Kiri (240px)\nFolderTree\n- Workspace Root\n- Folders (L1)\n- Subfolders (L2)\n- Quick Action Button"]
            CenterPanel["Panel Tengah (Flex-1)\nTaskCollection & Timeline\n- View Toggle (Table / Timeline / Board)\n- Filter Bar (Status, Assignee, Priority)\n- Task Rows / Feature List\n- Readiness Progress Meter"]
            RightPanel["Panel Kanan (480px / Drawer)\nTaskDetailDrawer (Full Context)\n- Header: Task Title & Status\n- Tab 1: Overview & Subtasks\n- Tab 2: Requirements & AC\n- Tab 3: QA Matrix & Test Runs\n- Tab 4: Bugs & Retest\n- Tab 5: QA Sign-off & Release"]
        end

        HeaderBlock --> BodyGrid
    end

    classDef shell fill:#0B1C30,stroke:#0B1C30,color:#FFFFFF;
    classDef panelL fill:#F8FAFC,stroke:#CBD5E1,stroke-width:2px,color:#0F172A;
    classDef panelC fill:#FFFFFF,stroke:#94A3B8,stroke-width:2px,color:#0F172A;
    classDef panelR fill:#F8FAFC,stroke:#B1E743,stroke-width:2px,color:#0F172A;

    class HeaderBlock shell;
    class LeftPanel panelL;
    class CenterPanel panelC;
    class RightPanel panelR;
```

---

## 3. Rute Navigasi Resmi (_Application Routes_)

| Rute URL                             | Komponen Halaman            | Fungsi & Cakupan                                                                                                          |
| :----------------------------------- | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `/work`                              | `WorkHubPage.tsx`           | Halaman utama: navigasi pohon folder, tabel task, filter, timeline, dan drawer detail fitur.                              |
| `/projects/:projectId/tasks/:taskId` | `TaskDeepLinkPage.tsx`      | Tautan langsung menuju task/fitur spesifik dengan mempertahankan konteks parent.                                          |
| `/my-tasks`                          | `MyTasksPage.tsx`           | Antrean kerja cerdas berbasis peran (_role-aware queue_) yang menjelaskan apa yang harus dikerjakan pengguna selanjutnya. |
| `/reports`                           | `ReportPage.tsx`            | Analitik historis kesiapan rilis dan audit kualitas berdasarkan data persisten backend.                                   |
| `/user-flows`                        | `UserFlowPage.tsx`          | Panduan interaktif alur kerja kolaborasi lintas peran.                                                                    |
| `/workspaces/settings`               | `WorkspaceSettingsPage.tsx` | Pengaturan anggota, role, spesialisasi developer, dan kebijakan pembuatan task (khusus Planner).                          |
| `/components`                        | `ComponentGalleryPage.tsx`  | Galeri showcase interaktif untuk memverifikasi seluruh komponen atom, molekul, dan organisme secara terisolasi.           |

---

## 4. Design Tokens & _Stitch Contract_

```mermaid
graph LR
    subgraph Tokens["Stitch Design Tokens (apps/web/tailwind.config.js)"]
        Lime["Brand Lime: #B1E743\n(Contrast Text: #141413 Charcoal)"]
        Navy["Sidebar Navy: #0B1C30\n(Contrast Text: #FFFFFF)"]
        Emerald["Success / Pass: #10B981"]
        Amber["Warning / In Review: #F59E0B"]
        Red["Fail / Bug: #EF4444"]
        Slate["Neutral / Muted: #64748B"]
    end

    subgraph Accessibility["Standar Aksesibilitas WCAG"]
        WCAG["WCAG AAA Contrast Ratio >= 7:1"]
        Touch["Minimum Touch Target 44px × 44px"]
        Keyboard["Full Keyboard Focus Outline"]
    end

    Lime --> WCAG
    Navy --> WCAG
    Tokens --> Touch
    Tokens --> Keyboard

    classDef limeToken fill:#B1E743,stroke:#84CC16,stroke-width:2px,color:#141413;
    classDef navyToken fill:#0B1C30,stroke:#1E293B,stroke-width:2px,color:#FFFFFF;
    classDef emToken fill:#10B981,stroke:#059669,stroke-width:2px,color:#FFFFFF;
    classDef amToken fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#FFFFFF;
    classDef rdToken fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#FFFFFF;
    classDef slToken fill:#64748B,stroke:#475569,stroke-width:2px,color:#FFFFFF;
    classDef a11y fill:#F1F5F9,stroke:#334155,stroke-width:2px,color:#0F172A;

    class Lime limeToken;
    class Navy navyToken;
    class Emerald emToken;
    class Amber amToken;
    class Red rdToken;
    class Slate slToken;
    class Accessibility,WCAG,Touch,Keyboard a11y;
```

---

## 5. Katalog Lengkap Komponen Atomic (`apps/web/src/components/ui/`)

### 🟢 Atoms

| Komponen         | File Path                  | Penggunaan & Varian                                                                            |
| :--------------- | :------------------------- | :--------------------------------------------------------------------------------------------- |
| `Button`         | `atoms/Button.tsx`         | Varian: `primary` (`#B1E743`), `secondary`, `danger`, `ghost`, `link`. Size: `sm`, `md`, `lg`. |
| `IconButton`     | `atoms/IconButton.tsx`     | Tombol aksi ikon dengan ukuran minimum 44px dan `aria-label`.                                  |
| `Badge`          | `atoms/Badge.tsx`          | Badge status atau hitungan numerik.                                                            |
| `Input`          | `atoms/Input.tsx`          | Field input teks standar dengan state error dan helper text.                                   |
| `Textarea`       | `atoms/Textarea.tsx`       | Field teks multi-baris.                                                                        |
| `Select`         | `atoms/Select.tsx`         | Pilihan dropdown tunggal.                                                                      |
| `Checkbox`       | `atoms/Checkbox.tsx`       | Checkbox acceptance criteria dan pemilihan item massal.                                        |
| `Avatar`         | `atoms/Avatar.tsx`         | Gambar profil pengguna atau inisial nama.                                                      |
| `Card`           | `atoms/Card.tsx`           | Kontainer kartu dengan radius 16px.                                                            |
| `Alert`          | `atoms/Alert.tsx`          | Banner informasi / peringatan visual.                                                          |
| `Accordion`      | `atoms/Accordion.tsx`      | Bagian buka-tutup konten.                                                                      |
| `LoadingSpinner` | `atoms/LoadingSpinner.tsx` | Indikator proses pemuatan data.                                                                |
| `ProgressBar`    | `atoms/ProgressBar.tsx`    | Indikator kemajuan persentase kelulusan tes/task.                                              |
| `Skeleton`       | `atoms/Skeleton.tsx`       | Shimmer placeholder saat data sedang dimuat.                                                   |
| `Tooltip`        | `atoms/Tooltip.tsx`        | Petunjuk mengambang pada elemen interaktif.                                                    |

### 🟡 Molecules

| Komponen                  | File Path                               | Penggunaan                                                    |
| :------------------------ | :-------------------------------------- | :------------------------------------------------------------ |
| `TaskStatusBadge`         | `molecules/TaskStatusBadge.tsx`         | Status task: `todo`, `in_progress`, `in_review`, `completed`. |
| `BugStatusBadge`          | `molecules/BugStatusBadge.tsx`          | Status bug: `critical`, `high`, `medium`, `low`.              |
| `DeliveryTraceSignal`     | `molecules/DeliveryTraceSignal.tsx`     | Indikator visual keterhubungan requirement dan delivery.      |
| `ReleaseReadinessSignal`  | `molecules/ReleaseReadinessSignal.tsx`  | Meteran kesiapan rilis dari snapshot backend.                 |
| `TaskScheduleHealthBadge` | `molecules/TaskScheduleHealthBadge.tsx` | Status kesehatan jadwal task (on-track / overdue).            |
| `DateRangePicker`         | `molecules/DateRangePicker.tsx`         | Pemilih rentang tanggal target jadwal rilis.                  |
| `EvidenceCard`            | `molecules/EvidenceCard.tsx`            | Kartu ringkasan bukti pengujian (thumbnail & tautan).         |
| `SearchInput`             | `molecules/SearchInput.tsx`             | Input pencarian dengan ikon dan tombol reset instan.          |
| `SubtaskRoleTimeline`     | `molecules/SubtaskRoleTimeline.tsx`     | Timeline visual perjalanan subtask dari Dev ke QA.            |
| `TaskHierarchyBreadcrumb` | `molecules/TaskHierarchyBreadcrumb.tsx` | Remah roti hierarki navigasi `Workspace > Folder > Task`.     |
| `Drawer`                  | `molecules/Drawer.tsx`                  | Panel geser samping untuk detail tugas.                       |
| `Modal`                   | `molecules/Modal.tsx`                   | Kotak dialog modal dengan backdrop.                           |
| `Snackbar`                | `molecules/Snackbar.tsx`                | Toast notifikasi aksi sukses / gagal.                         |
| `Tabs`                    | `molecules/Tabs.tsx`                    | Navigasi tab untuk pengelompokan konten.                      |

### 🟣 Organisms

| Komponen                    | File Path                                         | Penggunaan                                                                                    |
| :-------------------------- | :------------------------------------------------ | :-------------------------------------------------------------------------------------------- |
| `FolderTree`                | `organisms/FolderTree.tsx`                        | Pohon folder interaktif untuk navigasi struktur workspace.                                    |
| `TaskCollection`            | `organisms/TaskCollection.tsx`                    | Daftar / tabel tugas utama dengan filter dan sorting.                                         |
| `TaskTimelineView`          | `organisms/TaskTimelineView.tsx`                  | Visualisasi Gantt chart durasi subtask.                                                       |
| `TaskDetailDrawer`          | `organisms/TaskDetailDrawer.tsx`                  | Organisme utama penampil seluruh konteks parent Task, Requirements, Tests, Bugs, dan Dokumen. |
| `RequirementManager`        | `organisms/RequirementManager.tsx`                | Pengelola daftar Requirement dan Acceptance Criteria terkait fitur.                           |
| `QaTraceabilityMatrix`      | `organisms/QaTraceabilityMatrix.tsx`              | Matriks ketertelusuran hubungan antara Requirement, Test Case, dan Bug.                       |
| `ReleaseAssurancePanel`     | `organisms/ReleaseAssurancePanel.tsx`             | Panel evaluasi kesiapan rilis, QA Sign-off, dan PO Release Decision.                          |
| `BugExperiencePanel`        | `organisms/BugExperiencePanel.tsx`                | Panel pencatatan bug, delegasi perbaikan ke developer, dan verifikasi retest.                 |
| `EvidencePreviewModal`      | `organisms/EvidencePreviewModal.tsx`              | Modal preview media (Google Drive, video player YouTube/Loom, gambar fullscreen).             |
| `MyTasksDashboard`          | `organisms/MyTasksDashboard.tsx`                  | Dashboard utama antrean kerja personal berbasis peran.                                        |
| `QaTestingDesk`             | `organisms/myTasks/QaTestingDesk.tsx`             | Meja kerja QA untuk eksekusi test run, intake test case, dan logging hasil uji.               |
| `DevWorkingDesk`            | `organisms/myTasks/DevWorkingDesk.tsx`            | Meja kerja Developer untuk mengelola subtask aktif dan perbaikan bug.                         |
| `TestCaseImportWizardModal` | `organisms/myTasks/TestCaseImportWizardModal.tsx` | Wizard 3-langkah untuk impor Test Case dari spreadsheet CSV/XLSX.                             |
| `WorkspaceMembersTable`     | `organisms/WorkspaceMembersTable.tsx`             | Tabel manajemen anggota workspace, peran, dan spesialisasi dev.                               |

---

## 6. Diagram Penanganan State Antarmuka (_UI State Handling_)

Setiap komponen yang menampilkan data asynchronous wajib menangani 5 state antarmuka:

```mermaid
graph TD
    Req["Request Data from API"] --> StateHandler{"Status Data API?"}

    StateHandler -->|"loading"| S_Loading["1. Loading State\n(Render Skeleton / LoadingSpinner)"]
    StateHandler -->|"empty"| S_Empty["2. Empty State\n(Render EmptyState Component + Action CTA)"]
    StateHandler -->|"error"| S_Error["3. Error State\n(Render Alert + Retry Action Button)"]
    StateHandler -->|"forbidden"| S_Deny["4. Permission Denied State\n(Render AccessRestricted Organism)"]
    StateHandler -->|"success"| S_Success["5. Success / Ready State\n(Render Atoms / Molecules / Organisms)"]

    classDef load fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0B1C30;
    classDef empty fill:#F1F5F9,stroke:#64748B,stroke-width:2px,color:#334155;
    classDef error fill:#FEE2E2,stroke:#EF4444,stroke-width:2px,color:#991B1B;
    classDef deny fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef ok fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D;

    class S_Loading load;
    class S_Empty empty;
    class S_Error error;
    class S_Deny deny;
    class S_Success ok;
```
