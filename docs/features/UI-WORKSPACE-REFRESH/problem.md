# UI-WORKSPACE-REFRESH — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Applicable Policy IDs:** UI-001, UI-002, UI-003, UI-004, SDLC-001

## 1. Masalah

Pekerjaan di Qlick Hub tersebar antara Ringkasan, Task Hub, Tugas Saya, Laporan, dan detail Feature.
Pengguna sulit menjaga konteks saat berpindah layar, sementara beberapa masalah responsif dan interaksi
menghambat pencarian serta tindak lanjut pekerjaan.

## 2. Bukti masalah

| Bukti                                                                                                      | Sumber                                               | Level |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| Search desktop terjepit hingga sekitar 56 px.                                                              | Audit aplikasi lokal `/work` pada 1440×900.          | E4    |
| Layout tablet 768 px melebar hingga 943 px dan field status berada di luar viewport.                       | Audit aplikasi lokal `/work` pada 768×1024.          | E4    |
| Filter search/status ter-reset saat Table diganti ke Timeline.                                             | Reproduksi lokal dan `TaskHubDashboardTemplate.tsx`. | E1/E4 |
| CTA antrean `Tinjau Timeline` membuka Ringkasan & Rilis, bukan konteks jadwal.                             | Audit Owner lokal dan `MyTasksPage.tsx`.             | E1/E4 |
| Task Hub baru menawarkan table/timeline; Kanban subtask belum ada.                                         | `TaskHubDashboardTemplate.tsx`; audit lokal.         | E1/E4 |
| Tema light/dark sudah ada, tetapi fallback bootstrap dan provider berbeda untuk nilai storage tidak valid. | `apps/web/index.html`, `ThemeContext.tsx`.           | E1    |

Tidak ada bukti → tulis `unverified` dan cara mengumpulkannya. Jangan lanjut ke G0 hanya dengan asumsi.

## 3. Siapa yang terdampak

| Role       | Situasi                                                             | Seberapa sering         | Dampak                                           |
| ---------- | ------------------------------------------------------------------- | ----------------------- | ------------------------------------------------ |
| Owner / PO | Menilai konteks Feature, readiness, dan tindak lanjut lintas kerja. | Saat meninjau delivery. | Konteks terpecah dan prioritas sulit dipindai.   |
| Developer  | Melihat pekerjaan sendiri dan status subtask Feature.               | Saat eksekusi/review.   | Perlu berpindah layar untuk memahami progres.    |
| QA         | Membaca scope Feature, status QA, dan handoff.                      | Saat pengujian/retest.  | Risiko salah konteks bila hierarchy tidak jelas. |

## 4. Bila tidak dikerjakan

Masalah overflow dan target yang salah mengarahkan aksi memperlambat delivery. Tema yang tidak konsisten
dapat memunculkan flash atau kontras yang tidak dapat diandalkan. Menambahkan Kanban tanpa batas data
atau policy yang jelas juga berisiko membangun kalkulasi status berbeda dari backend.

## 5. Metrik sukses

| Metrik                                 | Baseline saat ini                    | Target                                                  | Cara mengukur                                    |
| -------------------------------------- | ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------ |
| Overflow horizontal pada ukuran audit. | Terjadi pada tablet.                 | Tidak terjadi pada phone/tablet/desktop yang diuji.     | Pemeriksaan browser E4.                          |
| Filter saat mengganti view.            | Search/status ter-reset.             | Tetap tersimpan sampai pengguna meresetnya.             | UI test + browser E2/E4.                         |
| Konsistensi tema.                      | Fallback invalid storage tidak sama. | Bootstrap dan provider sama, tanpa flash berlawanan.    | UI test + hard refresh E2/E4.                    |
| Kanban yang dapat dibaca.              | Tidak tersedia.                      | Subtask Feature tampil paginated dengan status kanonis. | Component/browser + authenticated read E2/E3/E4. |

## 6. Batasan dan di luar scope

- Perubahan status via drag-and-drop, bulk mutation, atau workflow baru.
- Endpoint, shared contract, skema, migrasi, dan perubahan authorization baru.
- Mengubah definisi readiness, coverage, atau agregat backend di React.
- Menjadikan role picker pada konsep sebagai mekanisme role switching produksi.
- Deploy Production atau mutasi data Production.

## 7. Unknown

| Pertanyaan                                                         | Mengapa penting                                           | Status                                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Apakah Kanban v1 cukup baca-saja per Feature?                      | Menentukan apakah mutation/workflow perlu phase terpisah. | Diputuskan untuk v1: ya, berdasarkan persetujuan rencana 2026-10-23. |
| Apakah `System` theme perlu ditambah?                              | Mengubah pilihan preferensi dan perilaku simpan.          | Tidak; pertahankan Light/Dark dengan default dark.                   |
| Apakah semua route memiliki sesi Dev, QA, dan PO yang dapat diuji? | Dibutuhkan evidence E4 lintas role.                       | Belum diverifikasi; menjadi prasyarat Phase test.                    |
