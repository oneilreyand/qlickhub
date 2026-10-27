# SIMPLE-UI-DELIVERY-FLOW — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-035](../../adr/ADR-035-SIMPLIFIED-SHELL-AND-FEATURE-DETAIL-PAGE.md) (Proposed) untuk shell dan detail sebagai halaman, wajib diterima sebelum build slice 1. Diperlukan sebelum tahap 2 slice 7 — catatan rilis, verifikasi Production, penerimaan, dan pemantauan menambah policy rilis (RELEASE-001/RELEASE-002). Slice lain tidak mengubah policy.
**Applicable Policy IDs:** AI-006, AI-013, SDLC-001, UI-001, UI-002, RELEASE-001, RELEASE-002, CONTRACT-001, DATA-001

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E; dokumen ini tidak
mengubah aturan tersebut.

## 1. Kondisi sekarang

- Detail task: `TaskDetailDrawer.tsx` (8 tab, full screen di atas shell) dan
  `myTasks/MyTaskDetailWorkspaceDrawer.tsx`.
- AI: `modules/ai/aiTaskGeneratorService.ts` sudah punya `generateDraft`, `refineChat`,
  `synthesizeFromChat`, dan `applyDraft` (satu transaksi: root task, Product Brief, requirement, AC,
  subtask, `task_requirements`). Draft tidak disimpan di server.
- Tugas Saya: `workQueueService.ts` (peran planner/developer/qa, 9 bucket) dan desk per peran.
- QA: `test_cases`/`test_case_versions`, pemetaan AC per versi (`test_case_version_acceptance_criteria`),
  `test_runs` (`build`, `environment`), `test_results`, bukti terkunci dengan manifest dan bukti susulan.
- Rilis: `qa_sign_offs`, `release_decisions` (`approved`/`rejected`), `bugs.environment`
  (`staging`/`production`); urutan rilis manual di `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §6–8.
- Desain target: canvas "Qlick Hub — Simple UI" (artifact Design, 2026-10-27). Analisis risiko:
  doc "Qlick Hub Simple UI — Analisis Risiko FE, BE & Data".

## 2. Opsi

|                              | Opsi A: bertahap per slice                                                                                                       | Opsi B: ganti sekaligus                                                                       | Opsi 0: tidak dikerjakan    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| Ringkasan                    | 9 slice; slice yang memakai data yang ada didahulukan, AI dan data baru belakangan; halaman baru di balik feature flag per peran | Satu cabang besar berisi shell, detail, Tugas Saya, QA, Plan AI, dan rilis; dirilis bersamaan | Biarkan seperti sekarang    |
| Pro                          | Tiap slice bisa diuji E4 dan di-rollback sendiri; nilai cepat terasa (shell, detail, QA)                                         | Satu kali migrasi pengguna; tidak ada masa dua UI                                             | Tanpa biaya                 |
| Kontra                       | Masa transisi dua UI per peran; lebih banyak PR dan gerbang                                                                      | WRA ±14/16; konflik besar dengan PR #58; regresi sulit dilacak; rollback semua-atau-tidak     | Masalah di problem.md tetap |
| Lapisan terdampak (FE/BE/DB) | FE dulu (slice 1–3), lalu FE+BE+DB                                                                                               | FE+BE+DB sekaligus                                                                            | —                           |
| Data / migrasi               | Aditif per slice; satu file migrasi per slice                                                                                    | Banyak migrasi dalam satu rilis                                                               | —                           |
| Authorization                | Endpoint baru diuji per peran per slice                                                                                          | Semua sekaligus                                                                               | —                           |
| Shared contract              | Berubah bertahap: AI clarification v2 (slice 5), catatan rilis (slice 7), `bugs.release_id`/`bugs.source` (slice 8)              | Semua sekaligus                                                                               | —                           |
| Estimasi WRA                 | 6–11 per slice; slice 5 (14) dipecah 5a/5b/5c                                                                                    | 14/16                                                                                         | —                           |
| Risiko & rollback            | Rollback per slice: matikan flag atau alihkan alias Vercel; migrasi aditif tetap                                                 | Rollback penuh ke deploy sebelumnya; data baru tertinggal                                     | —                           |

## 3. Rekomendasi

**Opsi A.** Metrik di problem.md §5 bisa dicapai satu per satu, dan setiap slice punya bukti E4
sendiri. Urutan:

| Urutan | Slice                                                                                                               | WRA              | Bergantung pada |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------- |
| 0      | Tutup PR #58 (UI-WORKSPACE-REFRESH) + Quick Card DETAIL-DRAWER-KEEP-SIDEBAR                                         | dinilai terpisah | —               |
| 1      | Shell sederhana + Task Hub (tanpa kolom Tahap)                                                                      | 6                | 0               |
| 2      | Detail Feature jadi halaman (PRD dan Task dari data yang ada) + redirect deep link `?taskId=`                       | 7                | 1               |
| 3      | QA: halaman Test Case + run dengan bukti gambar/tautan, centang per langkah, browser/perangkat                      | 9                | 2               |
| 4      | Tugas Saya per peran + pesan pengirim + riwayat serah-terima                                                        | 10               | 2               |
| 5a     | Tabel dan API Plan + draft tersimpan + Apply dari draft (tanpa UI)                                                  | ≤8               | 4               |
| 5b     | UI Plan → PRD → Task → Apply                                                                                        | ≤8               | 5a              |
| 5c     | Kolom Tahap di Task Hub                                                                                             | ≤6               | 5b              |
| 6      | ~~Keputusan rilis Tunda~~ — ditunda (keputusan Owner #4); pakai `rejected` + catatan                                | —                | —               |
| 7      | Rilis A: catatan rilis + verifikasi Production + penerimaan user (+ ADR)                                            | 10               | 4               |
| 8      | Rilis B: laporan user dicatat QA sebagai bug Production (`release_id`, `source`) + pemantauan 7 hari + tutup rilis  | 9                | 7               |
| 9      | ~~Video bukti dengan upload langsung ke storage~~ — ditunda (keputusan Owner #5); v1 memakai tautan video eksternal | —                | —               |

Setiap slice adalah Feature folder sendiri atau phase dalam folder ini; keputusan dibuat di G3
folder ini. Desk lama dihapus hanya setelah halaman pengganti lulus E4 untuk peran tersebut.

### Batas lingkungan (instruksi Owner, 2026-10-27)

Seluruh slice dikerjakan dan diverifikasi **di lokal** (`localhost`, database lokal) dulu. Push branch
dan PR ke GitHub boleh (Preview deploy Vercel diizinkan), tetapi **tidak ada merge ke `main`** karena
merge memicu deploy Production. Tidak ada deploy Production sampai Owner memutuskan lain. Bukti E4
pada fase ini adalah UAT lokal.

## 4. Dampak policy

- [ ] Tidak mengubah policy → tidak perlu ADR (berlaku untuk slice 1–5 dan 8)
- [x] Mengubah policy → ADR dibuat **sebelum** tahap 2 slice 7 (catatan rilis, verifikasi Production,
      penerimaan user, pemantauan), lalu SSoT terdampak diperbarui (`DOC-002`)

## 5. Keputusan

**Dipilih:** Opsi A (bertahap per slice) — oleh Owner (Reyand), 2026-10-27, pesan "setuju" atas
rekomendasi di percakapan Claude.
**Ditolak:** Opsi B (WRA ±14/16, rollback semua-atau-tidak, konflik dengan pekerjaan UI yang sedang
berjalan); Opsi 0 (masalah di problem.md tetap).

Keputusan Owner yang menyertai G1 (2026-10-27):

| #   | Keputusan                     | Pilihan                                                                  |
| --- | ----------------------------- | ------------------------------------------------------------------------ |
| 1   | Kapan root Feature dibuat     | Saat Plan dimulai, dengan tahap Plan                                     |
| 2   | Pesan antar peran             | Memakai `task_comments` yang ada + penanda serah-terima                  |
| 3   | Cek AC mandiri Developer      | Hanya di UI pada v1 (tanpa `task_ac_checks`)                             |
| 4   | Opsi Tunda di keputusan rilis | Ditunda; slice 6 keluar dari rencana awal                                |
| 5   | Video bukti                   | v1 gambar + tautan video eksternal; slice 9 ditunda                      |
| 6   | Tinggi header                 | Mengikuti 80px (P3.6); 64px dievaluasi di slice 1                        |
| 7   | Light/Dark dan HP             | Desain Dark dan HP dibuat sebelum slice 1                                |
| 8   | Deploy vs keputusan rilis     | Belum diputuskan; berlaku batas lingkungan lokal (tanpa merge ke `main`) |
| 9   | Pelapor bug Production        | Lewat QA/support; QA mencatat sebagai bug Production, tanpa peran baru   |
