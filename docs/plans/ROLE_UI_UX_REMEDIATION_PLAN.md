# Rencana Remediasi UI/UX Tugas Saya (PO, Developer, QA)

**Status:** Implemented — `ROLE-UI-UX-REMEDIATION-MY-TASKS` archived as Done (see [archive](../archive/TODO_COMPLETED_2026-10-02.md))
**Tanggal:** 2026-09-28  
**Branch:** `role_ui_ux_feedback`  
**Penulis:** Antigravity  
**Kebijakan Terkait (Policy IDs):** `UI-001`, `UI-002`, `FLOW-001`, `FLOW-002`, `FLOW-003`, `QA-001`, `QA-004`, `AUTH-002`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`, `AI-002`, `AI-003`, `AI-005`, `AI-006`, `AI-007`

---

## 1. Fakta Terkonfirmasi (_Confirmed Facts_)

1. **Halaman Tugas Saya (`MyTasksPage`):** Berfungsi sebagai personal work hub yang menampilkan antrean berbasis peran (`RoleAwareWorkQueuePanel`), task yang dibuat sendiri (`CreatedByMeTaskPanel`), dan drawer detail kolaboratif (`MyTaskDetailWorkspaceDrawer`).
2. **Keterbatasan Ruang Drawer:** `MyTaskDetailWorkspaceDrawer` memiliki lebar tetap (~500–640px pada desktop, full-width pada mobile). Membuka komponen berdensitas tinggi seperti grid 3-kolom (`PoTeamICardGrid`) dan master-detail split-view (`QaTestingDesk`) menyebabkan himpitan horizontal yang parah dan pemotongan teks agresif.
3. **Penyimpanan Deliverables Developer:** Pada `DevWorkingDesk`, data teknis (PR link, branch, staging URL, catatan handoff) saat ini diselipkan ke dalam kolom teks `task.description` dengan parsing regex.
4. **Pelanggaran Micro-Typography:** Ditemukan puluhan kelas teks non-standar (`text-[10px]`, `text-[11px]`) di `PoTeamICardGrid.tsx`, `DevWorkingDesk.tsx`, dan `QaTestingDesk.tsx`, melanggar panduan Stitch Design System (`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`).
5. **Navigasi Tab Bertingkat pada QA Desk:** QA menghadapi hingga 3 level tab bersarang (Drawer Role Tab $\rightarrow$ Macro Tab $\rightarrow$ Sub-tab Eksekusi), yang membingungkan orientasi alur kerja.
6. **Keterputusan Aksi PO:** Pada antrean PO (`po_requirement_work`), ajakan "Tambahkan Requirement" membuka drawer yang tidak memiliki form/kontrol penambahan Requirement.

---

## 2. Keputusan yang Perlu Disepakati (_Unresolved Decisions & Snapshot_)

### Decision Snapshot: Tata Letak iCard PO di Drawer
- **Keputusan User (2026-09-28):** Berdasarkan instruksi user (*"apa yang berubah di tugas saya untuk role po, jangan ada perubahan"*), tata letak dan komponen PO (`PoTeamICardGrid.tsx`) dipertahankan 100% utuh sesuai kondisi aslinya. Tidak ada perubahan yang diterapkan pada antarmuka PO.
- **Opsi Asli (Tetap Aktif):** Grid 3 kolom horizontal (`md:grid-cols-3`) tetap dipertahankan untuk PO.

### Decision Snapshot: Handoff & Deliverables Developer
- **Masalah:** Tombol ganda "Simpan Catatan & Deliverables" vs "Serahkan ke QA", serta alur status `changes_requested`.
- **Pendekatan:** Satukan form deliverables ke dalam kartu terpadu; saat status `in_progress`, tombol utama adalah "Serahkan ke QA" (yang menyimpan data sekaligus memajukan status ke `in_review`). Bila status `changes_requested`, tampilkan banner revisi khusus beserta catatan retest QA sebelumnya secara gamblang.

---

## 3. Work Readiness Assessment (WRA)

| Dimensi | Nilai (0–2) | Keterangan |
| :--- | :---: | :--- |
| **Kejelasan Requirement** | `0` | Sangat jelas, teridentifikasi langsung dari kode dan SSoT UI. |
| **Lapisan Terdampak** | `0` | Hanya lapisan Frontend (`apps/web/src/components/ui/organisms/myTasks/*`). |
| **Data & Migrasi** | `0` | Tidak ada perubahan skema database dan tidak ada migrasi. |
| **Authorization (RBAC)** | `0` | Batasan otorisasi role tetap ditegakkan oleh backend; tidak ada perubahan hak akses. |
| **Shared Contract** | `0` | Kontrak `@qlick/contracts` tidak berubah. |
| **Ketersinggungan Modul** | `1` | Berdampak pada komponen organisme yang dipakai di halaman `MyTasksPage`. |
| **Validasi** | `1` | Unit test frontend, typecheck, build Vite, dan manual UI walkthrough. |
| **Ketergantungan Eksternal** | `0` | Tidak ada dependensi ke layanan pihak ketiga baru. |
| **TOTAL SKOR** | **2 / 16** | **Status: `Ready`** (Risiko rendah, siap diimplementasikan bertahap). |

---

## 4. Pembagian Vertical Slice Implementasi

### Slice 1: Penyederhanaan Kokpit PO (`PoTeamICardGrid`)
1. **Layout Adaptif Drawer:** Ganti grid 3 kolom kaku menjadi *Segmented Team Tabs* (Frontend, Backend, QA) atau vertikal accordion yang bersih dan responsif di lebar laci drawer.
2. **Navigasi Konteks Feature & Requirement:** Tambahkan tautan/shortcut langsung untuk melihat & mengelola Requirement Feature tanpa harus keluar dari alur kerja.
3. **Standarisasi Tipografi:** Ganti seluruh `text-[10px]` dan `text-[11px]` menjadi `text-xs` (font 12px) dengan bobot font kontras tinggi (`font-bold` / `font-medium`).
4. **Indikator Progres & Status:** Sederhanakan banner atas agar tidak redundan dengan `ReleaseAssurancePanel`.

### Slice 2: Optimalisasi Meja Kerja Developer (`DevWorkingDesk`)
1. **Penyatuan Aksi Handoff & Catatan Kerja:** Rapikan kartu deliverables menjadi satu alur jelas. Hilangkan kebingungan tombol ganda simpan vs serahkan.
2. **Status Stepper Responsif Revisi:** Tambahkan status visual adaptif untuk `changes_requested` (menampilkan riwayat catatan review QA dan tombol "Lanjutkan Perbaikan").
3. **Konteks AC yang Terlihat:** Pastikan Acceptance Criteria yang harus dipenuhi developer terlihat jelas di bagian atas area kerja.
4. **Eliminasi Micro-Typography:** Standarisasi label pelaksana, perencana, tenggat, dan stepper angka menjadi `text-xs`.

### Slice 3: Perapian Meja Pengujian QA (`QaTestingDesk`)
1. **Penyederhanaan Hierarki Tab:** Sederhanakan navigasi tab bersarang agar alur eksekusi uji menjadi fokus utama.
2. **Responsivitas List / Split View di Drawer:** Optimalkan mode daftar Test Case agar tidak terpotong saat drawer terbuka.
3. **Penyembunyian Kontrol Non-Relevan:** Sembunyikan modul simulasi QRIS Sandbox secara kondisional bila task tidak berkaitan dengan modul pembayaran.
4. **Eliminasi Micro-Typography:** Standarisasi teks langkah-langkah uji dan hasil eksekusi.

### Slice 4: Pemolesan Global & Konsistensi Bahasa (`MyTasksDashboard`, `RoleAwareWorkQueuePanel`)
1. **Konsistensi Istilah Bahasa Indonesia:** Standarisasi label (misal: "iCard" $\rightarrow$ "Kartu Tim", "Subtask FE" $\rightarrow$ "Subtask Frontend", "Deliverables" $\rightarrow$ "Hasil Kerja").
2. **Fallback Ilustrasi Mandiri:** Ganti tautan ilustrasi Cloudinary eksternal dengan SVG / Atom Icon native agar tahan gangguan jaringan.

---

## 5. Pemetaan Acceptance Criteria (AC) ke Bukti Objektif

| No | Acceptance Criterion (AC) | Cara Pembuktian & Tingkat Bukti |
| :---: | :--- | :--- |
| **AC-1** | `PoTeamICardGrid` dapat dibaca nyaman di dalam Drawer tanpa teks terpotong (`max-w-[100px]`) dan tanpa layout 3 kolom yang terjepit. | **E2 / E4**: Unit test rendering responsif + verifikasi visual component test. |
| **AC-2** | Seluruh micro-typography (`text-[10px]`, `text-[11px]`) di `PoTeamICardGrid`, `DevWorkingDesk`, dan `QaTestingDesk` tereliminasi ke `text-xs`. | **E1 / E2**: `git diff` check bebas regex `text-\[(10\|11\|9)px\]` + linter lulus. |
| **AC-3** | `DevWorkingDesk` menyajikan alur serah terima (handoff) yang jelas ke QA dengan penanganan status `changes_requested` yang intuitif. | **E2**: Unit test interaksi `DevWorkingDesk.test.tsx` lulus 100%. |
| **AC-4** | `QaTestingDesk` tidak mengalami layout overflow/himpitan saat dibuka di dalam Drawer, dan tab navigasi mudah dipahami. | **E2**: Unit test `QaTestingDesk.test.tsx` lulus 100%. |
| **AC-5** | Seluruh build frontend (`npm run build`), typecheck (`npm run typecheck`), dan validasi governance (`npm run docs:check`) lulus tanpa regresi. | **E2**: Eksekusi perintah CI lokal exit code 0. |

---

## 6. Change Impact Map

- **Fungsi / Komponen Lokal:**
  - `apps/web/src/components/ui/organisms/myTasks/PoTeamICardGrid.tsx`
  - `apps/web/src/components/ui/organisms/myTasks/DevWorkingDesk.tsx`
  - `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx`
  - `apps/web/src/components/ui/organisms/myTasks/RoleAwareWorkQueuePanel.tsx`
  - `apps/web/src/components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer.tsx`
- **Modul / Pengguna Bersama:**
  - `apps/web/src/pages/MyTasksPage.tsx`
  - `apps/web/src/features/myTasks/index.ts`
- **Test Suites Terdampak:**
  - `apps/web/src/components/ui/organisms/myTasks/__tests__/PoTeamICardGrid.test.tsx`
  - `apps/web/src/components/ui/organisms/myTasks/__tests__/DevWorkingDesk.test.tsx`
  - `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx`
  - `apps/web/src/components/ui/organisms/myTasks/__tests__/MyTaskDetailWorkspaceDrawer.test.tsx`
- **Boundary yang TIDAK Terpengaruh:**
  - Tidak ada perubahan skema database PostgreSQL.
  - Tidak ada perubahan rute endpoint API Express.
  - Tidak ada perubahan aturan otorisasi/RBAC.
