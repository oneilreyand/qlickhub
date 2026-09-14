# Rencana SDLC, Kualitas Tim, dan Paket Rilis

**Status:** Active bertahap — P0/P1A/P1B selesai lokal; P1C blocked; K4–K7/K9–K10 menunggu keputusan
**Disusun:** Codex, 2026-09-12
**Pemilik keputusan yang diusulkan:** Product dan Engineering bersama perwakilan QA
**Cakupan pekerjaan saat ini:** pelacakan implementasi bertahap; bukan otorisasi deployment atau enforcement Production

## 1. Hasil yang dituju

Qlick Hub membantu tim menjawab dengan bukti persisten:

1. Apakah Requirement sudah cukup jelas untuk dikerjakan, dan versi mana yang disepakati?
2. Berapa kali Subtask kembali dari QA ke Dev, apa penyebabnya, dan berapa lama terhambat?
3. Apakah kualitas pekerjaan Product, Dev, dan QA membaik tanpa penilaian individu yang menyesatkan?
4. Feature/Task mana yang dipilih dalam satu paket rilis, versi aplikasi mana yang diuji, dan apakah versi itu sudah berjalan di Production?

Tidak termasuk: peringkat karyawan otomatis, penilaian berdasarkan baris kode/commit/jumlah bug,
perubahan framework, penggantian sistem CI/CD, penghapusan data lama, atau deployment otomatis oleh AI.
Rencana ini tidak menyatakan tim tertentu berkinerja buruk; data Production dan cara kerja nyata
belum diaudit dalam penyusunan rencana.

## 2. Fakta terkonfirmasi dan batas pengetahuan

| Area            | Bukti lokal                                                                                                                                                                              | Implikasi rencana                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Hierarki        | [Architecture](../1_ARCHITECTURE.md): Feature adalah root Task; Requirement milik Workspace dan dapat dipakai beberapa Task                                                              | Tidak membuat tabel Feature baru atau menggandakan Requirement per Task                                              |
| Konteks         | [Workflow](../2_WORKFLOW_AND_ROLES.md) dan [ADR-010](../adr/ADR-010-PRODUCT-BRIEF-REQUIREMENT-CONTEXT-OWNERSHIP.md): Product Brief berversi; AC milik Requirement                        | Gunakan ulang versi Product Brief; tambahkan baseline Requirement/AC tanpa memindahkan sumber kebenaran              |
| Requirement     | [Kontrak](../../packages/contracts/src/requirement.ts): draft/active/deprecated dan identitas AC stabil; belum ada baseline review formal di kontrak                                     | Jangan menyamakan active dengan Siap Dikerjakan atau mengganti enum tanpa keputusan                                  |
| Putaran review  | [Task lifecycle](../../apps/api/src/modules/tasks/internal/taskLifecycle.ts): status lama/baru, aktor, dan catatan dicatat                                                               | Riwayat bisa menjadi sumber awal; review teknis, QA, dan alasan historis belum otomatis dapat dipisahkan             |
| Pengujian       | [Kontrak Test Run](../../packages/contracts/src/testManagement.ts) memuat build/environment, tetapi tidak menyimpan scope Feature eksplisit pada Run                                     | Scope hasil perlu diperkuat sebelum dipakai untuk gate dan paket rilis                                               |
| Kesiapan rilis  | [Release service](../../apps/api/src/modules/releaseDecisions/releaseDecisionService.ts) memilih Run terbaru per Test Case dalam Workspace                                               | Audit kedua jalur individual dan batch; pengujian Feature/build lain tidak boleh memenuhi gate baru                  |
| Keputusan rilis | [Kontrak](../../packages/contracts/src/releaseDecision.ts) mengikat sign-off/decision ke featureTaskId                                                                                   | Batch pembacaan readiness bukan paket rilis persisten atau bukti deployment                                          |
| Bug             | [Kontrak Bug](../../packages/contracts/src/bug.ts) mensyaratkan testResultId, memiliki lifecycle dan audit                                                                               | Temuan Requirement sebelum coding perlu alur tersendiri; jangan merekayasa Test Result                               |
| Laporan         | [TaskReportDashboard](../../apps/web/src/components/ui/organisms/TaskReportDashboard.tsx) menghitung keadaan/penugasan saat ini                                                          | Analitik longitudinal harus dihitung backend dari seluruh sumber yang relevan, bukan halaman Task yang sedang dimuat |
| Backlog         | [TODO](../../TODO.md), QA-E2E-01 dan [ADR-011](../adr/ADR-011-QA-SUBTASK-LIFECYCLE-ALIGNMENT.md) sudah menunda Feature-scoped runs, evidence gate, retest attempts, dan rework analytics | Tahap di bawah melanjutkan pekerjaan tersebut, bukan mengulang lifecycle QA yang selesai                             |

Pemeriksaan statis ini telah dilanjutkan dengan [paket keputusan dan audit data P0](SDLC_P0_DECISION_AND_DATA_AUDIT.md).
Audit agregat read-only 2026-09-13 menemukan bahwa Production belum memiliki Test Run/Result, Bug,
QA sign-off, release decision, atau event pengembalian; karena itu KPI historis berstatus belum
tersedia, bukan nol. Catatan hasil lama di TODO tetap tidak menggantikan verifikasi target saat eksekusi.

### Perbedaan sumber yang harus direkonsiliasi pada tahap keputusan

- Architecture menuliskan lokasi migrasi `apps/api/src/database/migrations/`, sedangkan
  [konfigurasi Sequelize CLI](../../apps/api/.sequelizerc) menunjuk `apps/api/src/db/migrations/`.
  Rencana mencatat lokasi implementasi yang ditemukan; koreksi dokumentasi dilakukan eksplisit
  sebelum pekerjaan migrasi, bukan membuat direktori paralel.
- Diagram Workflow memakai label Bug CLOSED dan keputusan Conditional; kontrak saat ini memakai
  status/representasi yang harus dipetakan eksplisit sebelum menambah lifecycle. Jangan menganggap
  label presentasi sebagai enum API baru atau menambahkan kewenangan override dari rencana ini.

## 3. Batas kebijakan yang tetap berlaku

Sumber kanonikal: [Architecture](../1_ARCHITECTURE.md), [Workflow](../2_WORKFLOW_AND_ROLES.md),
[UI](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md),
[Deployment](../DEPLOYMENT_AND_ENVIRONMENTS.md), dan [Policy Registry](../POLICY_REGISTRY.md).

| Batas                                                                    | Policy IDs                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| Hierarki dan kepemilikan konteks                                         | `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`           |
| Membership dan enforcement backend; planning tetap Planner               | `AUTH-001`, `AUTH-002`, `FLOW-002`, `FLOW-003`     |
| QA publication, hasil immutable, retest independen, QA tanpa self-review | `QA-001`, `QA-002`, `QA-003`, `QA-004`             |
| Kesiapan dihitung backend; QA sign-off terpisah dari keputusan PO        | `RELEASE-001`, `RELEASE-002`                       |
| Persistensi, migrasi, penghapusan aman, dan kontrak bersama              | `DATA-001`, `DATA-002`, `DATA-004`, `CONTRACT-001` |
| UI bersama dan semua interaction states                                  | `UI-001`, `UI-002`                                 |
| PostgreSQL integration dan perubahan kebijakan terdokumentasi            | `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`        |

Semua perilaku baru di bawah adalah usulan. Kebijakan yang disepakati harus masuk ADR dan SSoT
sebelum implementasi. Feature Card tetap Draft sampai keputusan relevan selesai.

## 4. Keputusan yang perlu persetujuan

Tidak ada pilihan pada tabel ini yang otomatis disetujui hanya karena rencana sudah dibuat.
Persetujuan boleh per tahap; tidak perlu menunggu semua keputusan untuk menyelesaikan desain tahap awal.

K1, K2, K3, dan K8 disetujui pada 2026-09-13 dan dicatat dalam
[ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md). K4–K7 serta K9–K10
tetap berupa usulan dan tidak boleh dianggap aktif.

| ID lokal | Keputusan                                                                 | Rekomendasi awal                                                                                                                                                                                            | Menghalangi |
| -------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| K1       | Siapa menetapkan Siap Dikerjakan dan bagaimana penanganan masalah kritis? | Planner menetapkan baseline setelah masukan Dev dan QA tercatat; pertanyaan kritis terbuka menghalangi mulai kerja baru; jalur darurat perlu alasan dan kewenangan eksplisit                                | P1          |
| K2       | Siapa menetapkan penyebab temuan dan menyelesaikan perbedaan pendapat?    | Pelapor mengusulkan; triage lintas Product/Dev/QA mencatat kesepakatan; penyebab bersama/belum diketahui tetap sah. Pemutus sengketa ditetapkan secara eksplisit                                            | P1, P2, P5  |
| K3       | Unit pengembalian dan perubahan cakupan di tengah review                  | Putaran per Subtask Development; QA dan review teknis terpisah; perubahan baseline mengakhiri putaran lama dengan alasan, bukan kegagalan Dev otomatis                                                      | P2          |
| K4       | Siapa melihat analitik individu, retensi, ekspor, dan koreksi?            | Mulai dari agregat tim; detail individu belum dibuka sampai matriks akses dan mekanisme koreksi disetujui; tidak ada skor gabungan/ranking                                                                  | P5          |
| K5       | Unit paket rilis dan dependensi                                           | Satu Workspace, pilih root Feature; sertakan Subtask dan dependensi yang diperlukan. Penambahan dependensi harus dikonfirmasi, bukan diam-diam                                                              | P4          |
| K6       | Persetujuan paket, override, pembatalan, dan hotfix                       | Pertahankan QA/PO terpisah; paket membutuhkan bukti kandidat yang berlaku. Gate keamanan/integritas bukti tidak dapat dilewati. Aturan risiko bisnis yang dapat diterima dan jalur darurat harus ditetapkan | P3, P4      |
| K7       | Apa yang membatalkan bukti/persetujuan?                                   | Perubahan kandidat, cakupan, baseline Requirement/AC/Test Case atau environment relevan membuat hasil tidak berlaku untuk keputusan baru; histori tetap utuh; aturan uji ulang selektif disepakati          | P3, P4      |
| K8       | Data lama dan penerapan gerbang baru                                      | Tidak mengarang baseline, reviewer, penyebab, atau artifact. Status belum terverifikasi; pilot sebelum enforcement, jalur remediasi untuk pekerjaan yang sedang berjalan                                    | P1–P5       |
| K9       | Definisi waktu, jendela observasi, dan kriteria kecukupan data            | Simpan timestamp UTC, tampilkan zona Workspace; mulai dengan durasi kalender berlabel. Usulan pilot 4–6 minggu dan observasi bug 30 hari per rilis, bukan standar wajib atau SLA                            | P2, P5, P6  |
| K10      | Bagaimana mencatat deployment dan siapa pelaksananya?                     | MVP mencatat deployment eksternal beserta bukti terverifikasi; integrasi otomatis diputuskan setelah provider/pemetaan repository jelas. Mencatat rilis tidak memberi hak deploy atau migrasi               | P4          |

## 5. Alur target dan model konseptual

```text
Product Brief + Requirement/AC
  → pembahasan Product–Dev–QA → baseline Siap Dikerjakan
  → Dev mengerjakan → review kode → siap diuji
  → putaran QA → lulus atau kembali dengan temuan → perbaikan dan retest
  → pilih Feature untuk paket rilis → bekukan kandidat dan dependensi
  → pengujian integrasi/regresi kandidat → QA sign-off → keputusan PO
  → audit migrasi dan kesiapan operasi → deployment → verifikasi Production
  → observasi bug/hasil bisnis → evaluasi perbaikan proses
```

Status pengerjaan Task, hasil QA, persetujuan rilis, status deployment, dan ketersediaan fitur bagi
pengguna adalah dimensi berbeda. Task `done` tidak otomatis menjadi deployed. Fitur dengan feature
flag nonaktif dapat sudah terpasang tetapi belum tersedia bagi pengguna.

### Konsep data yang diusulkan, bukan kontrak final

- **Baseline delivery:** mengikat root Feature pada versi Product Brief, Requirement dan AC yang
  disepakati. Requirement tetap satu entitas Workspace; perubahan versi bersama memberi informasi
  dampak kepada semua Feature terkait tanpa diam-diam mengganti baseline mereka.
- **Temuan Requirement:** pertanyaan, gap, atau ambiguitas yang boleh dicatat sebelum Test Run;
  memiliki tahap penemuan, bukti, tingkat dampak, penanggung jawab tindak lanjut, dan keputusan.
- **Putaran review:** identitas Subtask, jenis review, baseline, build, waktu handoff/outcome,
  aktor dan peran/penugasan saat kejadian. Event persisten, append-only; koreksi merujuk event asal.
- **Klasifikasi temuan:** bedakan asal cacat, alasan tidak tertangkap, dan pemilik tindakan korektif.
  Kategori awal: implementasi, Requirement kurang/ambigu, perubahan kebutuhan, pengujian/data/
  environment, serta bersama/belum diketahui. Revisi kategori diaudit dan tidak menggandakan temuan.
- **Scope pengujian:** Run mengikat Feature, QA Subtask yang relevan, versi Test Case/AC, kandidat
  aplikasi dan environment. Retest attempt mengikat Bug ke hasil uji baru yang immutable.
- **Paket dan kandidat rilis:** paket berisi item Feature; revisi kandidat menyimpan cakupan,
  baseline, referensi perubahan kode, artifact/deployment, konfigurasi/flag non-secret yang relevan,
  rencana migrasi, dependensi, dan persetujuan. Revisi baru tidak menimpa kandidat yang disetujui.
- **Deployment dan verifikasi:** satu kandidat dapat memiliki beberapa percobaan deployment;
  simpan hasil gagal/sukses/rollback, pelaksana, waktu, environment, dan bukti verifikasi secara terpisah.
- **Analitik:** query backend Workspace-scoped atas sumber tersebut; respons menyertakan periode,
  versi definisi metrik, denominator, ukuran sampel, pengecualian, kelengkapan data, dan tautan bukti.

Gunakan relasi eksplisit dan foreign key Workspace; jangan membuat tabel relasi polymorphic universal.
Payload final hanya didefinisikan di shared contracts saat implementasi, bukan disalin sebagai API
aktif di rencana. Kebutuhan endpoint final dan error contract diselesaikan per vertical slice.

## 6. Tahapan implementasi dan kriteria penerimaan

Kerjakan satu slice pada satu waktu; setiap slice mencakup kontrak, backend, UI, dan pengujian
yang relevan. ID P0–P6 adalah urutan lokal rencana, bukan klaim item implementasi sudah dimulai.

### P0 — Keputusan, audit data, dan penyelarasan sumber

Paket keputusan, audit agregat Lokal/Production, rekonsiliasi sumber, dan peta pembaca tersedia di
[audit P0](SDLC_P0_DECISION_AND_DATA_AUDIT.md). K1–K3/K8 sudah disetujui; ADR-013, Architecture,
Workflow, dan Policy Registry sudah diselaraskan. P1A/P1B selesai secara lokal dalam mode
observasi; preflight P1C diblokir oleh prasyarat anggota dan Subtask QA pada Workspace pilot.

- Selesaikan K1–K3/K8 untuk tahap awal, lalu keputusan tahap lain sesuai dependensinya.
- Rekonsiliasi perbedaan sumber pada §2, dokumentasikan keputusan di ADR/SSoT, perbarui Feature Card.
- Audit read-only pada environment yang telah dikonfirmasi: kelengkapan histori status, hasil QA,
  reusable Requirement/Test Case, record legacy, dan sumber identitas build/deployment.
- Petakan semua pembaca readiness, cancellation, task deletion, dan antrean kerja yang terdampak.
- **Diterima bila:** keputusan memiliki pemilik dan hasil eksplisit; gap data dan strategi legacy
  tercatat tanpa secret; tidak ada asumsi terselubung tentang akses, skema, atau bukti Production.
- **Dependensi:** tidak ada; ini titik mulai berikutnya setelah rencana disetujui.

### P1 — Kesiapan Requirement dan pencegahan cacat

- **Status:** P1A dan P1B mode observasi selesai di implementasi lokal. Atas keputusan pengguna
  14 September 2026, target P1C dipindahkan ke Workspace development `kerjaa`. Pilot belum mulai
  karena Workspace belum memiliki anggota Development/QA, root Feature, atau Subtask; hard gate
  tetap nonaktif.
- P1a: baseline Requirement/AC berversi dan histori perubahan dalam konteks Feature. Slice P1A
  mengirim snapshot immutable dan deteksi perubahan tanpa mengubah sumber kanonikal Requirement.
- P1b: Temuan Requirement, klarifikasi, posisi triage Product–Development–QA, hasil konsensus atau
  pemutus sengketa yang berversi, dan riwayat penyelesaian tanpa mewajibkan hasil QA palsu. Temuan
  kritis terbuka dihitung backend tetapi belum menolak transisi Subtask selama mode observasi.
- P1c: panel Siap Dikerjakan dan masukan Dev/QA. P1A mengirim pencatatan serta presentasi dalam
  mode observasi; enforcement K1/K8 menunggu pilot dan slice lanjutan. Periode awal yang direncanakan
  adalah 13 September–11 Oktober 2026, tetapi harus digeser bila prasyarat lintas peran belum lengkap
  agar jendela observasi tidak dipendekkan diam-diam. Keputusan retarget dan baseline kelengkapan
  terbaru tercatat pada
  [laporan P1C Kerjaa](../reports/SDLC_P1C_KERJAA_OBSERVATION_PILOT_RETARGET_2026-09-14.md).
- Checklist berbasis risiko: masalah/tujuan, alur utama dan kegagalan, role/izin, aturan/data,
  dependensi, AC yang bisa diuji, scope, dan kebutuhan non-fungsional relevan. N/A memerlukan alasan.
- **Diterima bila:** Dev/QA dapat memberi masukan tanpa mengubah planning; perubahan AC membuat
  versi baru; Feature lain yang memakai Requirement tidak berganti baseline tanpa keputusan;
  penghalang kritis terlihat dan server menolak aksi yang melanggar gate yang disepakati.
- **Dependensi:** P0 dan K1/K2/K8.

### P2 — Putaran QA–Dev dan penyebab pengerjaan ulang

- P2a: handoff/review round per Subtask, jenis review, timestamp dan snapshot ownership historis.
- P2b: pengembalian dengan alasan baru per putaran, tautan temuan, dan jalur klasifikasi/koreksi.
- P2c: riwayat yang menunjukkan berapa kali kembali, penyebab, antrean dan hambatan.
- Satu putaran QA yang mengembalikan Subtask dihitung sekali walau mempunyai banyak Bug.
  Retry request atau dua reviewer bersamaan tidak membuat dua outcome untuk putaran yang sama.
- Satu putaran dapat memiliki beberapa penyebab: tampilkan sebagai multi-label sehingga jumlah
  per kategori bisa melebihi total putaran; jangan menyajikannya sebagai pembagian yang saling eksklusif.
- **Diterima bila:** contoh tiga putaran (kembali karena gap, kembali karena kode, lulus) menghasilkan
  dua pengembalian; review kode tidak ikut hitungan QA; pergantian assignee tidak menulis ulang histori;
  canceled/belum selesai tetap ditampilkan terpisah. Reopen Bug bukan tambahan pengembalian otomatis.
- **Dependensi:** P1a/P1b dan K3/K9; bukti Run formal dilengkapi P3 sebelum gate rilis mengandalkannya.

### P3 — Scope bukti QA, retest formal, dan gate yang dapat dipercaya

- P3a: persist scope Feature/kandidat/versi definisi pada Run, dengan validasi seluruh relasi.
- P3b: tautkan setiap retest Bug ke Run/Result baru; Dev tidak boleh memverifikasi perbaikannya sendiri.
- P3c: perbaiki semua kalkulasi readiness individual/batch dan invalidasi persetujuan yang terdampak.
- P3d: jika disetujui, aktifkan gate penyelesaian QA setelah scope terbukti; jangan kembali ke self-review.
- Coverage dibedakan antara pemetaan Test Case, skenario yang benar-benar dieksekusi, dan kelulusan.
  Blocked/skipped/missing evidence tidak boleh terlihat sebagai passed.
- **Diterima bila:** satu Test Case yang dipakai dua Feature tidak memindahkan kelulusan antar-Feature;
  build/environment/versi AC salah ditolak sebagai bukti; failed run terbaru tidak ditutupi older pass;
  histori immutable tetap terbaca; sign-off lama tetap historis, bukan valid untuk kandidat baru.
- **Dependensi:** P1a, P2, K6/K7/K8; melanjutkan ADR-011, bukan mengulang QA-E2E-01.

### P4 — Paket rilis sampai Production terverifikasi

- P4a: pilih root Feature, tinjau dependensi, susun manifest dan revisi kandidat persisten.
- P4b: tampilkan gate per Feature dan paket, hasil integrasi/regresi, QA sign-off dan keputusan PO.
- P4c: simpan percobaan deployment, status migrasi, pemeriksaan pascadeploy, dan rollback target.
- Pilihan Task harus direkonsiliasi dengan isi artifact. Task tak terpilih yang kodenya ikut build
  harus dikeluarkan atau dijelaskan dengan mekanisme flag dan pengujian yang disetujui; checkbox
  aplikasi tidak dapat menjanjikan isolasi kode dengan sendirinya.
- Kandidat yang diuji harus sama dengan yang dirilis. Jika provider memerlukan rebuild atau
  konfigurasi build berbeda, perlakukan sebagai kandidat baru dengan validasi yang relevan.
- Migrasi merupakan prasyarat rilis terpisah: audit target/status, recovery plan, persetujuan target,
  eksekusi terkontrol, dan verifikasi. Tidak dijalankan otomatis dari build aplikasi.
- **Diterima bila:** seluruh item/dependensi dan artifact dapat ditelusuri; kandidat usang tidak bisa
  disetujui ulang tanpa evaluasi; callback ulang/out-of-order tidak menggandakan atau memundurkan
  status; deployment sukses tetapi smoke test gagal tidak tampil sebagai Production terverifikasi;
  rollback mempertahankan histori. Task di luar paket tetap bisa dikerjakan.
- **Dependensi:** P3 dan K5/K6/K7/K10. Integrasi provider otomatis bukan syarat MVP pencatatan rilis.

### P5 — Dashboard kualitas Product, Dev, QA, dan delivery

- P5a: backend aggregation dengan definisi §7, provenance dan uji perhitungan; tanpa skor gabungan.
- P5b: tampilan tim pada Report serta drill-down ke baseline, putaran, temuan, dan kandidat.
- P5c: detail individu hanya setelah K4 disetujui; tidak mengandalkan role saat ini untuk atribusi lama.
- Tambahkan pengamatan bug Production (termasuk tanpa Test Result pra-rilis), paparan fitur, dan
  hasil bisnis dengan sumber nyata; jangan mengakali kontrak CreateBug lama dengan Run palsu.
- **Diterima bila:** filter/periode tidak mengubah denominator diam-diam; data kosong/legacy tampil
  belum cukup data, bukan nol sempurna; Task dan Subtask tidak dihitung ganda; seluruh angka dapat
  direkonsiliasi dengan record backend; hak akses berlaku pula pada detail dan ekspor.
- **Dependensi:** P1–P3 untuk metrik proses; P4 untuk metrik deployment/Production; K2/K4/K9.

### P6 — Pilot lintas peran dan penerapan bertahap

- Jalankan satu paket rilis kecil dengan record persisten pada Preview, mencakup gap Requirement,
  cacat kode, dua pengembalian QA, retest, perubahan kandidat, serta simulasi deployment gagal.
- Observasi Product/Dev/QA menggunakan UI tanpa panduan langkah demi langkah; catat keberhasilan
  tugas, salah interpretasi, kebutuhan bantuan, dan waktu menyelesaikan tugas, bukan hanya opini.
- Pilot pengukuran tim mengikuti periode yang disepakati; bahas baseline, beban kerja, dan kasus
  outlier sebelum menetapkan target perbaikan. Tidak menetapkan angka KPI industri secara arbitrer.
- **Diterima bila:** angka direkonsiliasi bersama, blocker kritis terselesaikan, alur desktop/mobile
  dan aksesibilitas tervalidasi, recovery rehearsed, dan pemilik rollout memberi keputusan eksplisit.
- **Dependensi:** slice yang dipilotkan selesai; penerapan gate Production menunggu bukti dan persetujuan.

## 7. Definisi awal pengukuran yang adil

Ini spesifikasi usulan untuk disahkan melalui K2/K3/K4/K9. Bukan target performa atau penilaian HR.
Mulai dari agregat tim/aplikasi; jangan mencampur kompleksitas, area delivery, atau periode berbeda.

| Tim/aspek                  | Definisi awal                                                                                                                         | Batas interpretasi                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Product: kesiapan pertama  | Baseline yang diterima tanpa revisi material pada review pertama / baseline yang review pertamanya telah diputuskan dalam periode     | Catat versi dan jumlah sampel; pembatalan/pending terpisah                                                        |
| Product: gap terlambat     | Feature unik yang mulai Dev dalam kohor dan mempunyai gap Requirement terkonfirmasi setelah mulai / seluruh Feature mulai dalam kohor | Kohor yang belum cukup lama diamati diberi label sementara; satu Feature dihitung sekali                          |
| Product: klarifikasi       | Durasi interval terhambat dengan alasan menunggu keputusan Product; median dan distribusi                                             | Durasi kalender bukan jam kerja aktif; interval tumpang tindih dihitung union                                     |
| Product: perubahan cakupan | Baseline berubah setelah mulai, dipisahkan gap, perubahan bisnis, dan pembelajaran baru                                               | Perubahan bukan otomatis cacat Product; dampak pengerjaan ulang dibuktikan, bukan ditebak                         |
| Dev: kelulusan QA pertama  | Subtask dengan outcome QA pertama lulus / Subtask dengan outcome QA pertama lulus atau kembali pada periode                           | Outcome pertama diikat baseline; pending/canceled ditampilkan, review teknis dikecualikan                         |
| Dev: pengembalian          | Jumlah round QA dengan outcome kembali per Subtask, beserta kategori/severity dan baseline                                            | Jangan jumlahkan ulang parent+Subtask; multi-cause tidak harus berjumlah sama dengan total                        |
| Dev: kualitas implementasi | Temuan implementasi terkonfirmasi dan pengerjaan ulang terkait, menurut kompleksitas/area/keparahan                                   | Waktu status bukan ukuran produktivitas coding; rework effort belum tersedia tanpa pencatatan khusus              |
| QA: pencegahan             | Temuan Requirement terkonfirmasi sebelum coding dan contoh dampak yang dicegah                                                        | Jangan membuat kuota temuan atau mengarang jam penghematan                                                        |
| QA: cakupan risiko         | Risiko kritis dalam kandidat yang telah diuji dengan bukti valid / risiko kritis disepakati dalam kandidat                            | Lulus/gagal/blocked terpisah; pemetaan Test Case saja bukan telah diuji                                           |
| QA: laporan bug            | Laporan memenuhi rubrik / laporan dalam sampel review yang ditetapkan                                                                 | Rubrik: konteks/build, langkah atau kondisi intermiten, aktual/harapan, dampak, bukti; bukan sekadar diterima Dev |
| QA: umpan balik            | Antrean dari siap diuji ke mulai; durasi ke hasil pertama yang dapat ditindaklanjuti; interval blocked terpisah                       | Ready mensyaratkan build, akses, dan data; rubrik kesiapan disepakati                                             |
| QA: retest                 | Retest dengan hasil baru dan pemeriksaan dampak sesuai risiko / retest yang ditinjau                                                  | Bug reopened bukan otomatis QA gagal; bedakan perbaikan belum benar dan verifikasi sebelumnya tidak memadai       |
| Bersama: cacat lolos       | Bug unik yang pertama ditemukan di Production per kandidat dalam jendela observasi, menurut severity, asal cacat dan celah deteksi    | Known accepted risks terpisah; tidak ada bug belum membuktikan kualitas bila paparan pengguna rendah              |
| Bersama: delivery          | Waktu commit→Production, frekuensi deployment, pemulihan deployment gagal, rasio deployment gagal dan rework deployment               | Memerlukan data Git/deployment/insiden; jika sumber tidak ada tampil unavailable, bukan hitungan dari Task done   |
| Bersama: nilai produk      | Ukuran keberhasilan yang dipilih Product per Feature, sumber dan hasil pascarilis                                                     | Selesai tepat waktu tidak menggantikan bukti masalah pengguna terselesaikan                                       |

Semua metrik menyertakan periode/kohor, numerator/denominator bila rasio, versi rumus, sample size,
dan persentase kelengkapan data. Denominator nol menghasilkan tidak tersedia. Ambang sampel minimal
dan pembatasan akses disepakati sebelum tampilan individu. Koreksi sebab disimpan berversi;
laporan lama dapat direproduksi dengan waktu cut-off, bukan berubah tanpa penjelasan.

Rujukan konteks dari pembahasan sebelumnya: [SPACE](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/)
mengingatkan produktivitas bukan satu dimensi; [DORA](https://dora.dev/guides/dora-metrics/)
untuk delivery tingkat aplikasi/tim; [ISTQB Test Management](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTAL-TM_Syllabus_v3.0_zKjKsaN.pdf)
untuk pengukuran berbasis risiko dan efektivitas pengujian. Rumus operasional di atas adalah usulan lokal,
bukan klaim sertifikasi atau kepatuhan universal.

## 8. UI/UX dan berkas yang kemungkinan berubah

### Pengalaman pengguna

- **Task detail:** gunakan panel Requirement yang ada untuk Siap Dikerjakan dan klarifikasi;
  riwayat putaran pada Jejak Delivery/Aktivitas. Jangan menambahkan banyak tab tingkat atas sekaligus.
- **My Tasks:** tampilkan satu aksi utama berikutnya per konteks: Tinjau Requirement, Lengkapi
  Requirement, Mulai Pengujian, Perbaiki Temuan, atau Uji Ulang; alasan antrean dari backend.
- **Paket rilis:** alur Pilih Feature → Periksa Kesiapan → Tinjau Persetujuan → Pantau Deployment.
  Lokasi menu/rute baru disetujui saat desain P4; jangan mengubah route kanonikal dari plan saja.
- **Report:** ringkasan Product/Dev/QA/Delivery, penjelasan rumus dan sumber, lalu detail saat dibuka.
  Bahasa Indonesia alami; pertahankan istilah kanonikal Workspace, Feature, Task, Requirement, QA.
- Gunakan komponen yang telah diperiksa di `apps/web/src/components/ui` dan
  [Component Gallery](../../apps/web/src/pages/ComponentGalleryPage.tsx): Card, Badge, Alert,
  Modal/Drawer, Tabs, EvidenceCard, DataTable, dan pola antrean/perizinan yang ada.
- Verifikasi lebar 360/768/1440 px, light/dark, fokus keyboard, nama aksesibel, touch target,
  loading/empty/error/retry/disabled/permission-denied. Bedakan belum ada data dari bukti tidak lengkap.

### Peta perubahan saat implementasi

| Area              | Berkas/lokasi yang ditemukan                                                                                                                                                        | Tambahan yang mungkin diperlukan                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Kebijakan         | `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/POLICY_REGISTRY.md`, `docs/adr/`                                               | ADR per keputusan; Feature Card per slice besar                              |
| Kontrak           | `packages/contracts/src/requirement.ts`, `featureReadiness.ts`, `activity.ts`, `testManagement.ts`, `bug.ts`, `releaseDecision.ts`                                                  | Kontrak paket/deployment/analitik sesuai keputusan                           |
| Persistensi       | `apps/api/src/db/models/`, `apps/api/src/db/migrations/`, asosiasi/index model                                                                                                      | Relasi eksplisit, index analitik, constraint Workspace, audit                |
| Backend           | `apps/api/src/modules/featureReadiness/`, `requirements/`, `tasks/internal/taskLifecycle.ts`, `testManagement/`, `bugs/`, `releaseDecisions/`                                       | Modul paket/analitik bila tidak cocok dengan tanggung jawab modul yang ada   |
| Frontend          | `FeatureReadinessPanel.tsx`, `RequirementManager.tsx`, `taskDetail/`, `myTasks/QaTestingDesk.tsx`, `BugExperiencePanel.tsx`, `ReleaseAssurancePanel.tsx`, `TaskReportDashboard.tsx` | Organisme kecil reusable untuk putaran dan paket                             |
| Data frontend     | `apps/web/src/lib/api/`, `apps/web/src/store/reportSlice.ts`, store terkait                                                                                                         | Shared-contract services/Redux Thunk untuk endpoint baru                     |
| Pengujian/operasi | `__tests__` modul terkait, `apps/api/scripts/`, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`                                                                                               | Kasus scope/evidence/release/migration dan runbook sesuai integrasi terpilih |

Lokasi P1A/P1B di atas sudah final pada implementasi lokal. Lokasi slice setelahnya tetap dikonfirmasi
saat item tersebut diklaim.

## 9. Authorization, migrasi, dan rollout

### Authorization

Planner tetap mengubah Requirement/planning, QA membuat draf Test Case dan melakukan verifikasi,
Dev mengerjakan Subtask/perbaikan, QA memberikan sign-off, dan PO mengambil keputusan rilis.
QA tidak boleh memublikasikan Test Case sepihak atau menutup review QA miliknya melalui self-review.
Hak baru untuk memberi masukan baseline, triage, laporan individu, pembatalan paket, dan pencatatan
deployment harus ditetapkan per aksi pada P0; tidak diasumsikan dari tampilan UI atau role global.
Seluruh reads/mutations/ekspor/deep links tetap memvalidasi membership dan Workspace di backend.
Jika integrasi provider dipilih, signature, replay protection, least privilege dan audit wajib diuji.

### Risiko migrasi dan kompatibilitas

Risiko utama: histori lama tidak lengkap, salah atribusi, hasil uji tercampur, stale approvals,
dependensi penghapusan baru, serta perbedaan versi frontend/API selama rollout.

1. Audit data read-only dan inventaris versi schema di target yang dikonfirmasi.
2. Uji migrasi additive pada PostgreSQL disposable bersih dan jalur upgrade dari data legacy realistis.
3. Tambahkan relasi/snapshot tanpa mengubah hasil uji lama. Field scope legacy boleh belum diketahui;
   requirement baru wajib untuk penulisan baru setelah cutover yang disepakati.
4. Backfill hanya bila relasi dapat dibuktikan secara deterministik; simpan provenance/backfill version.
   Record ambigu tetap legacy dan tidak dipakai sebagai bukti kandidat baru atau nilai individu.
5. Perluas guard penghapusan Requirement/Task agar baseline, review dan paket baru tidak terhapus
   melalui jalur koreksi lama. Selaraskan retensi dengan kebijakan penghapusan Workspace yang berlaku.
6. Rollout per Workspace pilot: pencatatan → observasi → remediasi → enforcement. Mode observasi
   bukan izin memakai evidence salah pada persetujuan baru; pembatasan gate legacy perlu keputusan eksplisit.
7. Production memerlukan persetujuan target, backup yang dapat dipulihkan, status migrasi sebelum/
   sesudah, dan deployment kompatibel. Rollback aplikasi tidak otomatis melakukan down migration.

Tidak ada migrasi destruktif yang diusulkan. Jadwal implementasi ditetapkan setelah audit P0 dan
kapasitas tim diketahui; urutan dependency lebih dapat dipercaya daripada estimasi tanggal spekulatif.

## 10. Validasi, bukti, dan definisi selesai

### Validasi per slice

- Contract/unit: input invalid, enum, kalkulasi metrik, denominator nol, data legacy, cohort boundary.
- PostgreSQL integration: canonical migrations, fixture tersimpan dan dibaca kembali, foreign key/
  Workspace integrity, RBAC allow/deny, append-only audit, rollback transaksi dan concurrency.
- Regression utama: Test Case dipakai dua Feature; kandidat lama tidak valid untuk versi baru;
  dua reviewer/retry tidak menggandakan round; perubahan assignee; multi-cause; penghapusan tertolak;
  perubahan Requirement bersama; callback deployment out-of-order; hasil blocked/skipped/missing.
- Frontend: seluruh state, konsumsi angka backend, akses detail/ekspor, empty vs incomplete,
  navigasi keyboard, bahasa alami, layout mobile dan desktop.
- UAT lintas peran di Preview memakai persisted records melalui API terotentikasi. Data factory
  hanya di test support; mock hanya external seams, bukan database, policy atau service internal.

### Perintah yang direncanakan, belum dijalankan untuk implementasi

```bash
npm run docs:check
npm --prefix packages/contracts run test
npm --prefix apps/web run test
npm --prefix apps/api run test:integration
npm --prefix apps/api run db:verify:clean-migrations
npm run validate
npm run build
```

Perintah database hanya setelah konfigurasi test diverifikasi menunjuk PostgreSQL disposable;
jangan mengasumsikan file env aktif aman. Tambahkan focused tests sesuai slice dan gunakan runbook
[Deployment](../DEPLOYMENT_AND_ENVIRONMENTS.md) untuk Preview/Production dengan izin terpisah.

Slice selesai jika AC-nya terbukti dengan data persisten, authorization/audit benar, migrasi bersih
dan upgrade aman, UI states/desktop/mobile terverifikasi, serta laporan mencantumkan command tepat,
pass/fail/skipped, warning, environment tanpa secret, dan gap. Build saja bukan bukti workflow selesai.
Paket rilis selesai hanya setelah versi/cakupan, persetujuan, migrasi, deployment dan verifikasi
Production dapat ditelusuri. Dashboard tidak dianggap selesai jika angkanya tak dapat diaudit.

## 11. Handoff dan langkah pertama

- P0 selesai setelah keputusan K1–K3/K8, audit data, ADR, dan SSoT diselaraskan.
- P1A dan P1B selesai secara lokal dalam mode observasi; hard gate tetap nonaktif.
- Pekerjaan berikutnya adalah memenuhi prasyarat lintas peran P1C pada Workspace development
  `kerjaa`, lalu menetapkan jendela pilot empat minggu secara eksplisit. Jangan membuat anggota,
  Feature, Subtask, Test Result, atau bukti QA palsu untuk membuka blocker.
- P2–P6 belum aktif. Buat dan klaim satu item pelaksanaan per slice setelah dependensi serta keputusan
  relevan selesai; jangan langsung membangun dashboard atau menjalankan migrasi Production.
- [Feature Card Draft](../features/SDLC_QUALITY_AND_RELEASE.md) menjadi penghubung lintas lapisan.
- [Laporan penyusunan rencana](../reports/SDLC_QUALITY_RELEASE_PLAN_2026-09-12.md) mencatat verifikasi
  dokumentasi saja; [TODO](../../TODO.md) memisahkan status plan dari implementasi.
