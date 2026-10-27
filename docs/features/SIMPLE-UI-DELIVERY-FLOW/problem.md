# SIMPLE-UI-DELIVERY-FLOW — Tahap 0: Problem Statement

**Status:** Disetujui
**Disetujui:** Owner (Reyand), 2026-10-27, pesan "setuju"
**Gerbang:** G0 — disetujui oleh PO/Owner
**Applicable Policy IDs:** SDLC-001, UI-001, UI-002, RELEASE-001, RELEASE-002, AI-013

## 1. Masalah

PO, Developer, dan QA sulit melihat apa yang harus mereka kerjakan, siapa menunggu siapa, dan di
tahap mana sebuah Feature berada. Alur Plan → PRD → Task → Apply belum eksplisit, dan setelah keputusan
rilis tidak ada catatan verifikasi Production, penerimaan user, maupun pemantauan bug dari user.

## 2. Bukti masalah

| Bukti                                                                                                                                                                                              | Sumber                                                                                                                                        | Level |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Detail task memuat 8 tab (Detail Task, Brief Produk, Requirement, Jejak Delivery, Bug, Subtask, Aktivitas, Diskusi) dalam satu drawer 1.375 baris                                                  | `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` (`detailTabs`)                                                                    | E1    |
| Drawer detail dibuka full screen dan menutupi Sidebar serta Header                                                                                                                                 | `TaskDetailDrawer.tsx` (`defaultFullScreen={true}`), `molecules/Drawer.tsx` (`fixed inset-0`)                                                 | E1    |
| Draft AI (pertanyaan klarifikasi, PRD, subtask) hanya hidup di browser sampai Apply; pertanyaan berupa teks bebas tanpa wajib/opsional atau alasan                                                 | `packages/contracts/src/aiTaskGenerator.ts` (`GeneratedTaskClarificationSchema`), `apps/api/src/modules/ai/aiTaskGeneratorService.ts`         | E1    |
| Tugas Saya terbagi ke desk per peran yang besar (`DevWorkingDesk` 1.021 baris, `PoTeamICardGrid` 716, `QaTestingDesk` 553) dan item antrean hanya membawa alasan sistem, bukan pesan dari pengirim | `apps/web/src/components/ui/organisms/myTasks/`, `apps/api/src/modules/workQueue/workQueueService.ts`                                         | E1    |
| Keputusan rilis hanya `approved`/`rejected`; tidak ada catatan deploy, verifikasi Production, penerimaan user, atau masa pemantauan di aplikasi                                                    | `packages/contracts/src/releaseDecision.ts`, template `docs/features/_template/release.md`                                                    | E1    |
| Merge ke `main` langsung men-deploy Production, terpisah dari keputusan rilis di aplikasi                                                                                                          | `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §6, keputusan Owner untuk mempertahankan auto-deploy                                                    | E1    |
| Upload bukti melewati fungsi API (body mentah) ke storage `local`/`google_drive`; batas skema 15 MB                                                                                                | `apps/api/src/modules/attachments/attachmentController.ts`, `apps/api/src/services/storageService.ts`, `packages/contracts/src/attachment.ts` | E1    |
| Waktu yang dibutuhkan pengguna untuk menemukan pekerjaan berikutnya                                                                                                                                | `unverified` — diukur lewat observasi UAT per peran sebelum G2                                                                                | —     |

## 3. Siapa yang terdampak

| Role        | Situasi                                                      | Seberapa sering | Dampak                                                                                |
| ----------- | ------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------- |
| PO          | Menyusun Feature, menjawab pertanyaan, memutuskan rilis      | Setiap Feature  | Konteks tersebar di 8 tab dan modal AI; draft hilang bila browser ditutup             |
| Developer   | Mengerjakan subtask, menindaklanjuti masukan QA dan bug      | Harian          | Harus mencari alasan dan pesan dari QA/PO di tab lain                                 |
| QA          | Membuat Test Case, menjalankan uji, mengunggah bukti, retest | Harian          | Bukti video berisiko gagal terunggah; tidak ada tempat mencatat verifikasi Production |
| Owner       | Menjaga rilis dan Production                                 | Setiap rilis    | Tidak ada jejak siapa memverifikasi Production dan kapan rilis aman ditutup           |
| User bisnis | Menemukan masalah setelah rilis                              | Setelah rilis   | Belum ada jalur melapor yang tertaut ke rilis                                         |

## 4. Bila tidak dikerjakan

Waktu tim habis untuk mencari konteks dan menanyakan status. Draft PRD bisa hilang. Bug Production
tidak tertaut ke rilisnya, sehingga keputusan rollback atau hotfix tidak berbasis bukti dan rilis
tidak pernah resmi ditutup.

## 5. Metrik sukses

| Metrik                                                    | Baseline saat ini | Target                                          | Cara mengukur                 |
| --------------------------------------------------------- | ----------------- | ----------------------------------------------- | ----------------------------- |
| Jumlah tab/bagian di detail Feature                       | 8 tab             | 4 tahap (Plan, PRD, Task, Apply) + menu Lainnya | Inspeksi UI                   |
| Item Tugas Saya yang menampilkan pengirim dan pesannya    | 0%                | 100% item serah-terima                          | Query antrean + UAT per peran |
| Draft Plan/PRD/Task yang bertahan setelah browser ditutup | 0%                | 100%                                            | Test E3                       |
| Rilis dengan verifikasi Production tercatat               | 0%                | 100% rilis baru                                 | Data `releases`               |
| Bug Production tertaut ke rilis                           | `unknown`         | 100% laporan baru                               | Data `bugs.release_id`        |
| Waktu menemukan pekerjaan berikutnya per peran            | `unknown`         | Ditentukan setelah baseline                     | Observasi UAT sebelum/sesudah |

## 6. Batasan dan di luar scope

- Tidak mengganti Gemini atau menambah penyedia AI.
- Tidak mengubah aturan otorisasi peran yang ada, kecuali peran pelapor bila disetujui di G1.
- Tidak menambahkan tool pemantauan error (Sentry dan sejenisnya); itu keputusan terpisah.
- Tidak mengubah mekanisme deploy Vercel pada fase awal.
- Tidak menghapus desk lama sebelum halaman baru per peran lulus E4.

## 7. Unknown

| Pertanyaan                                                                  | Mengapa penting                                         | Siapa bisa menjawab     |
| --------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------- |
| Kapan root Feature dibuat: saat Plan dimulai atau saat Apply?               | Menentukan desain `feature_plans` dan tampilan Task Hub | Owner                   |
| Pesan antar peran memakai `task_comments` atau entitas baru?                | Menentukan read model antrean                           | Owner                   |
| Cek AC mandiri Developer disimpan atau hanya di UI?                         | Menentukan perlu tidaknya `task_ac_checks`              | Owner / PO              |
| Opsi Tunda ditambahkan ke keputusan rilis?                                  | Mengubah shared contract, perlu ADR                     | Owner                   |
| Video bukti: v1 gambar + tautan, atau upload langsung ke storage?           | Batas body fungsi Vercel; perlu dicek di Production     | Owner + data Production |
| Tinggi header 64px atau 80px (P3.6)?                                        | Konflik dengan UI-WORKSPACE-REFRESH                     | Owner                   |
| Light/Dark dan tampilan HP didesain sebelum build?                          | `theme:check` dan UI-002 mewajibkan keduanya            | Owner                   |
| Deploy Production tetap otomatis saat merge, atau menunggu keputusan rilis? | Urutan rilis vs keputusan                               | Owner                   |
| Siapa yang boleh melapor bug Production?                                    | Peran pelapor belum ada                                 | Owner                   |

Semua pertanyaan di atas dijawab Owner pada 2026-10-27; lihat [solution.md](solution.md) §5.
