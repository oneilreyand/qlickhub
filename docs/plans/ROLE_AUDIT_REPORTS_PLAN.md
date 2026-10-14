# ROLE-AUDIT-REPORTS — Laporan per Role

**Status:** Draft rencana; implementasi belum dimulai  
**Disusun ulang:** Codex, 2026-10-06 (Asia/Jakarta)  
**Baseline inspeksi:** `1473c023c2fe016629a6fe615fe87a0c53347c3f` (`main`)  
**Draft task:** `ROLE-AUDIT-REPORTS` (belum dibuat atau ditambahkan ke TODO)

Rencana ini merinci slice laporan pada [roadmap SDLC P5](SDLC_QUALITY_AND_RELEASE_PLAN.md),
bukan sumber kebijakan baru. Sumber kanonikal adalah [Product Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md),
[Architecture](../1_ARCHITECTURE.md), [Workflow](../2_WORKFLOW_AND_ROLES.md),
[UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md),
[Policy Registry](../POLICY_REGISTRY.md), dan [ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md).

**Policies:** `AUTH-001`, `AUTH-002`, `AUTH-011`, `FLOW-004`, `FLOW-006`, `FLOW-007`,
`QA-002`, `QA-005`, `QA-007`, `QA-008`, `RELEASE-001`, `RELEASE-002`, `RELEASE-003`,
`DATA-001`, `DATA-005`, `DATA-006`, `CONTRACT-001`, `UI-001`, `UI-002`, `UI-003`, `UI-004`,
`PERF-001`, `TEST-001`, `AI-007`, `AI-009`, `AI-010`, `AI-013`, `AI-014`,
`DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`, `DOC-005`.

## Tujuan

Sediakan laporan lintas PO, Developer, dan QA yang membantu melihat pekerjaan, bukti, progres,
jadwal, serta hambatan harian dan bulanan. Informasi performa dipakai untuk memahami proses dan
menentukan follow-up. Tidak ada skor, ranking, atau penilaian otomatis karyawan.

## Fakta implementasi saat ini

Saat disusun ulang, branch `main` memiliki lima perubahan UI terkait QA Desk pada `Drawer.tsx`,
`MyTaskDetailWorkspaceDrawer.tsx`, `QaTestingDesk.tsx`, `TestCaseFormModal.tsx`, dan
`TestCaseImportWizardModal.tsx`. Semua perubahan tersebut tidak terkait dan harus dipertahankan.

| Area            | Fakta sumber primer                                                                                                                                                                         | Implikasi                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/reports`      | [ReportPage](../../apps/web/src/pages/ReportPage.tsx) menampilkan `TeamCapacityTimeline`                                                                                                    | Tiga tab lintas role belum tersedia                                                        |
| Kapasitas       | [Contract](../../packages/contracts/src/capacity.ts) dan API capacity memakai Dev/QA dan Subtask aktif                                                                                      | Dapat menyumbang jadwal aktif; tidak cukup untuk daftar kerja selesai bulanan/aktivitas PO |
| Leader Hub      | [LeaderHubPage](../../apps/web/src/pages/LeaderHubPage.tsx) memiliki tab Timeline, Quality, Digest; Workspace lintasnya Owner/Admin                                                         | Lokasi laporan dan nasib tab lama perlu diputuskan                                         |
| Feed audit      | [workspaceActivity](../../apps/api/src/modules/workspaces/internal/workspaceActivity.ts) menggabungkan Task, Bug, Test Case, Folder, membership; data tiap sumber dibatasi sebelum digabung | Feed berguna untuk melihat event, tetapi `total` bukan agregat bulanan lengkap             |
| Metrik Leader   | `getLeaderQualityMetrics` tidak memakai timeframe, mengaitkan Bug dengan assignee saat ini, dan mengembalikan nol pada denominator kosong                                                   | Tidak menjadi histori performa bulanan yang dapat dipercaya                                |
| Histori review  | Workflow §4 menyatakan `reviewedBy`/`reviewNotes` adalah state terakhir; histori review round terstruktur dibutuhkan                                                                        | Jangan simpulkan jumlah review/durasi dari field terbaru                                   |
| Batas kebijakan | Workflow §2 melarang klasifikasi menjadi skor/ranking; §7 dan ADR-013 menetapkan kelengkapan, denominator serta keputusan akses K4/K9                                                       | Akses individu dan definisi periode masih harus diputuskan                                 |

Inspeksi ini hanya membaca kode/dokumen. Kelengkapan data Production serta kesiapan PostgreSQL
test/UAT belum dibuktikan.

## Rancangan tiga tab

Filter bersama: Workspace aktif, bulan/tanggal, role, anggota, Feature, dan status. Pertahankan
pilihan saat berpindah tab dan simpan dalam URL. V1 memakai satu Workspace.

### 1. Timeline

- Toggle **Hari / Bulan** dan navigasi periode.
- Jadwal Task/Subtask tampil sebagai rentang tanggal tersimpan. Event aktual ditandai terpisah dari
  rencana.
- Baris dikelompokkan per role/anggota: planning dan keputusan rilis PO; Subtask/perbaikan Bug Dev;
  Test Run/Result, Bug/retest, dan sign-off QA.
- Pekerjaan tanpa jadwal memiliki bagian tersendiri. Klik membuka Task/Feature dan evidence yang
  boleh dilihat.

### 2. Kanban

- Kolom memakai status Task kanonikal: `todo`, `in_progress`, `in_review`, `changes_requested`,
  `done`, `canceled`.
- Card Subtask menampilkan assignee, role/area, Feature, prioritas, jadwal, dan bukti. Aktivitas PO
  ditampilkan pada konteks Feature/Planning, tidak dicampur sebagai Subtask.
- Tampilkan blocker dan handoff berikutnya dengan alasan backend. Board hanya-baca.
- V1 memperlihatkan status saat ini untuk item yang relevan pada periode filter. Jangan menyebutnya
  snapshot masa lampau kecuali histori status lengkap tersedia.

### 3. Performa Individu

Pilih anggota dan bulan untuk melihat ringkasan faktual serta daftar kerja yang bisa dibuka ke bukti.
Subjudul yang disarankan: **Kontribusi dan progres bulanan**.

| Role      | Rincian pekerjaan/bukti                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| PO        | Product Brief, Requirement/AC, baseline readiness, temuan/klarifikasi, release decision dan alasan override |
| Developer | Subtask dikerjakan/diserahkan untuk review, bukti teknis, perbaikan Bug, status retest QA                   |
| QA        | Test Case/versi, Test Run, Result/evidence, Bug/retest, QA sign-off                                         |

Informasi tambahan: item selesai dalam periode dan item yang masih terbuka; terlambat/tanpa jadwal;
handoff menunggu Dev, QA, atau keputusan PO; bukti tersedia/tidak tersedia/tidak terverifikasi;
Test `blocked`, Bug critical/high terbuka, dan coverage AC belum lengkap. Setiap jumlah dapat dibuka
ke daftar sumber. Pisahkan status saat ini dari aktivitas selama periode.

Tidak ada skor total, urutan terbaik/terburuk, target otomatis per orang, atau rasio tanpa ukuran
sampel. Jumlah Bug yang ditugaskan kepada seseorang bukan bukti orang tersebut penyebab Bug.

## Keputusan yang masih terbuka

| ID      | Keputusan                                 | Rekomendasi untuk dibahas                                                                                    | Dampak                                                       |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| D1      | Lokasi laporan                            | Perluas `/reports` untuk laporan Workspace; pertahankan Leader Hub untuk ringkasan Owner/Admin               | Menentukan akses, navigasi, dan nasib tab Leader yang ada    |
| D2 / K4 | Siapa boleh melihat detail individu lain? | Ringkasan untuk member aktif; setiap anggota melihat detail diri; Owner/Admin/PO melihat detail anggota lain | Boundary otorisasi baru; perlu keputusan produk dan ADR/SSoT |
| D3      | Makna Kanban historis                     | V1 menampilkan status saat ini dengan label; snapshot tanggal lampau perlu histori lengkap                   | Menentukan perlu tidaknya event status baru                  |
| D4 / K9 | Zona waktu dan periode                    | Timestamp UTC, kalender dalam zona Workspace; bila belum ada, zona laporan eksplisit                         | Menentukan batas hari/bulan                                  |

D1–D4 masih usulan. Plan tidak memperluas authorization. Policy yang berubah harus mengikuti
`DOC-002`: ADR dan pembaruan SSoT sebelum implementasi.

## Tahapan implementasi

| Slice                           | Hasil                                                                                                                     | Gate/evidence                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| S0 — Keputusan dan audit sumber | Putuskan D1–D4; petakan sumber event, role saat kejadian, kelengkapan dan kebutuhan retensi/koreksi; siapkan Feature Card | D2/D4 jelas; WRA, capability PostgreSQL/browser/UAT, file scope, AC-to-evidence dan Approval Window diperbarui |
| S1 — Timeline                   | Kontrak/API/UI Hari/Bulan, jadwal dan event PO/Dev/QA, filter bersama, daftar tanpa jadwal                                | PostgreSQL membuktikan batas waktu, attribution, Workspace scope, pagination                                   |
| S2 — Kanban                     | Status resmi, card role/Feature, handoff/bukti, filter                                                                    | Card/summary direkonsiliasi ke seluruh record; board tak memutasi data                                         |
| S3 — Individu                   | Akses D2, dossier bulanan dan daftar kerja per role dengan drill-down                                                     | Unauthorized access diuji; angka direkonsiliasi; data historis ambigu tetap unknown                            |
| S4 — Verifikasi/rollout         | Quality review, uji responsif, UAT, report dan TODO sesuai AC                                                             | Verifikator/CI menerima AC; merge/deploy punya otorisasi tersendiri                                            |

Kerjakan satu slice pada satu waktu. Gunakan sumber persisten yang ada. Tambah event atau migrasi
hanya jika audit membuktikan kebutuhan; jelaskan ownership, FK, retention, transaction, index,
clean migration, dan recovery. Tidak ada mutasi Production pada scope ini.

## Dampak kode dan rancangan teknis

| Area        | Path kemungkinan                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract    | `packages/contracts/src/roleAuditReport.ts`, `index.ts`, contract tests                                                                                         |
| API         | Modul read-only `apps/api/src/modules/reports/`, router/controller/service, PostgreSQL integration tests                                                        |
| Data        | Sumber Task/activity, Requirement/readiness, Bug/retest, QA Result/evidence, sign-off/release; migration hanya jika perlu                                       |
| Frontend    | `ReportPage.tsx` atau route menurut D1; API client/hooks; report organisms dan tests                                                                            |
| UI reuse    | `Tabs`, `DateRangePicker`, `Select`, `Card`, `Badge`, `DataTable`, `TaskStatusBadge`, `EvidenceCard`, `Drawer`, `EmptyState`, `Skeleton`; cek Component Gallery |
| Dokumentasi | Feature folder dari template, ADR/SSoT jika policy berubah, TODO dan satu report evidence                                                                       |

Satu service backend menetapkan definisi query dan agregat untuk semua tab; tab memuat data saat
dibuka. Summary dihitung atas seluruh scope, bukan hasil satu halaman. Authorization/redaction
ditegakkan backend untuk summary, daftar, pagination, detail dan evidence. V1 satu Workspace;
akses lintas Workspace mengikuti `AUTH-011` jika kelak diputuskan.

## Acceptance criteria dan evidence

| AC   | Kriteria                                                                                    | Evidence objektif                                                                              |
| ---- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| AC1  | Tiga tab berbagi filter dan mempertahankan URL setelah refresh/perpindahan tab              | Router/component tests dan browser terautentikasi                                              |
| AC2  | Timeline harian/bulanan memisahkan jadwal dengan event aktual per role                      | PostgreSQL/API: event di batas hari/bulan/zona; UI viewport                                    |
| AC3  | Kanban memakai status resmi, memisahkan Feature dari Subtask, hanya-baca                    | API count/card direkonsiliasi; tes UI memastikan tak ada mutasi                                |
| AC4  | Daftar bulanan menunjukkan pekerjaan faktual, attribution, evidence dan status kini/periode | PostgreSQL fixtures valid: reassignment/perubahan role, carry-over, pagination, legacy unknown |
| AC5  | Summary tidak berubah karena pagination; zero dibedakan dari unavailable                    | Integration: lebih dari satu halaman, denominator 0, event ambigu/tidak lengkap                |
| AC6  | Workspace scope dan matriks D2 ditegakkan di API                                            | PostgreSQL integration: membership, self/role lain, cross-Workspace, evidence access           |
| AC7  | QA/readiness/release memakai scope kandidat dan evaluator backend kanonikal                 | Persisted Result/Bug/retest/sign-off/decision, termasuk kandidat berbeda                       |
| AC8  | Responsive/accessibility dan async state sesuai baseline                                    | Browser 390×844, 820×1180, 1440×900; keyboard/focus/touch/loading/empty/error/disabled/denied  |
| AC9  | Query terbatas dan tanpa N+1 berisiko                                                       | PostgreSQL disposable, query count/plan, payload/latency dengan baseline/gap                   |
| AC10 | Dokumentasi, quality review dan verifikasi independen lengkap                               | docs:check, diff check, pemeriksaan kode/test/build relevan, evidence package                  |

Integration memakai PostgreSQL disposable, canonical migrations, dan factory valid. Jangan mock
Sequelize, authorization, migration, atau repository. Fixture frontend tidak menggantikan bukti
persisted; UAT membaca API terautentikasi. Catat exact command, exit code, pass/fail/skip/warning,
environment dan gap di report final.

## WRA, Approval Window, dan Change Impact Map

WRA penyusunan plan: **1/16, Ready** untuk dokumen saja; bukti berupa inspeksi sumber, validasi
dokumen dan diff check. WRA implementasi awal: **12/16, Blocked sebelum S0** karena melintasi API,
UI, query, kontrak, dan authorization; akses PostgreSQL/browser/UAT belum dibuktikan. Hitung ulang
per slice setelah D1–D4 dan capability diketahui.

Approval Window implementasi **belum disetujui**. Setelah keputusan dan capability final, ajukan
baseline terbaru, satu slice, path persis, urutan, AC/evidence, masa berlaku, WRA dan recovery
bersama untuk satu persetujuan. Perubahan policy/RBAC, destructive migration/backfill, Production,
secret/dependency, perluasan scope, perubahan baseline/expiry, merge/protected push menghentikan
window sesuai Agent Guidelines. Pembuatan ulang plan ini tidak mengotorisasi implementasi.

| Area              | Dampak                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| Route/state       | Query URL, filter/tab dan async states; reuse report components         |
| API/contracts     | Read model dan interface additive; satu definisi metrik server-side     |
| Persistensi       | Baca dari record existing; migration hanya atas kebutuhan terverifikasi |
| Authorization     | Boundary individu ditentukan D2 dan ditegakkan server-side              |
| Workflow/evidence | Sinyal dari sumber QA/release kanonikal; workflow tidak berubah         |
| Performance       | Multi-source joins, count, pagination, query latency                    |
| Docs/release      | Feature Card, ADR/SSoT bila perlu, TODO, satu evidence report           |

Klasifikasi: **cross-boundary change**. Review reuse/DRY, overlap, obsolete code/docs, best
practice/boundary, dan cakupan regresi wajib dilakukan sebelum kandidat selesai.

## Catatan rekonstruksi dan verifikasi

Plan sebelumnya ada sebagai file tidak terlacak dan perubahan README lokal. Saat checkout dilanjutkan,
repo berada di branch `main`, commit `1473c02`; perubahan dokumen tersebut tidak ada. Lima perubahan
UI yang terlihat tetap tersimpan. Plan ini direkonstruksi dari percakapan serta inspeksi read-only
atas SSoT dan implementasi baseline baru, bukan pemulihan byte-per-byte.

Setelah file dibuat, jalankan `npm run docs:check` dan `git diff --check`; catat hasil aktual.
Tes aplikasi, PostgreSQL, browser, verifikasi independen, task claim, commit, PR, merge, dan deploy
belum dilakukan.
