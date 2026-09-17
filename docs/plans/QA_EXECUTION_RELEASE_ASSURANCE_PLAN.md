# Rencana QA Execution dan Release Assurance Skala Industri

- **Status:** Draft implementation plan — arah target disetujui pengguna 2026-09-15; policy runtime belum berubah
- **Owner keputusan:** Product dan Engineering bersama QA
- **Cakupan:** lanjutan P3 pada [Rencana SDLC induk](SDLC_QUALITY_AND_RELEASE_PLAN.md)
  **Policy terkait:** `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-001`, `FLOW-002`, `QA-001`, `QA-002`, `QA-003`, `QA-004`, `RELEASE-001`, `RELEASE-002`, `DATA-001`, `DATA-002`, `DATA-005`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

Dokumen ini memperinci P3 tanpa menggantikan Architecture atau Workflow. Perubahan otorisasi,
coverage, evidence gate, dan release governance baru menjadi kebijakan aktif setelah ADR, SSoT,
Policy Registry, kontrak, dan implementasi diselaraskan dalam urutan tersebut.

Audit UX setelah implementasi S1–S5 menemukan dead-end pada retest, antrean yang belum sepenuhnya
capability-scoped, dan QA Desk yang terlalu padat. Urutan perbaikannya dirinci pada
[Rencana Remediasi UX Alur QA End-to-End](QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md). Rencana tersebut
tidak mengubah policy plan ini; ia menyelaraskan navigasi, kontrak capability, progressive
disclosure, dan browser E2E dengan batas yang sudah disahkan.

## 1. Hasil yang dituju

1. Hanya QA assignee yang menjalankan pekerjaan QA normal: membuat/mengubah draf Test Case,
   menjalankan Test Run, mencatat Result, membuat Bug, melakukan retest, dan memberi QA Sign-off.
2. PO mereview/mengaktifkan Test Case serta membuat Release Decision, tanpa mengeksekusi atau
   mengubah status Subtask QA.
3. Owner/Admin mengawasi, mengelola penugasan, dan membaca evidence; eksekusi QA darurat hanya
   melalui break-glass yang sempit, beralasan, kedaluwarsa, dan ter-audit.
4. Setiap Result dapat dibuktikan berasal dari Feature, QA Subtask, versi Test Case, baseline
   Requirement/Acceptance Criteria, build/kandidat, dan environment yang sama.
5. Bug hanya menjadi `verified` atau `reopened` melalui Retest Attempt yang menunjuk Result baru
   yang immutable.
6. Penyelesaian Subtask QA, QA Sign-off, dan Release Decision memakai snapshot evidence yang sama,
   bukan kalkulasi browser atau Run terbaru yang bercampur antar-Feature.
7. Notifikasi handoff tersimpan, idempotent, dapat diulang, dan menjangkau QA signer serta seluruh
   Developer terkait tanpa bergantung pada pengiriman push best-effort.
8. Setiap Result `passed` memiliki sedikitnya satu evidence image/video yang dapat dibuka langsung;
   Bug menampilkan evidence Result asal, evidence resolusi Developer, dan seluruh evidence retest
   secara kronologis sampai outcome terakhir.

Tidak termasuk dalam slice ini: menjalankan deployment, mengubah provider CI/CD, menghapus histori
legacy, memberi skor individu, atau mengizinkan AI melakukan aksi produksi otonom.

## 2. Fakta terkonfirmasi dan konflik yang harus diselesaikan

| Area           | Keadaan aktif                                                                                                              | Dampak                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Test Case      | Owner/Admin/PO/QA dapat membuat; QA hanya mengubah draf, Planner dapat publish/archive                                     | Arah baru perlu memisahkan authoring QA dari review/publish Product secara eksplisit      |
| Test execution | Owner/Admin/QA dapat membuat Run dan Result; PO read-only                                                                  | Hak fallback Owner/Admin masih otomatis, bukan break-glass                                |
| QA Subtask     | UI dan backend memberi Planner management luas; Workflow menyatakan QA assignee menjalankan `todo → in_progress → done`    | PO dapat terlihat/bertindak sebagai eksekutor QA walau bukan pemilik evidence             |
| Run scope      | `TestRun` memiliki Workspace, Test Case, build, environment, executor                                                      | Belum ada `featureTaskId`, `qaSubtaskId`, Test Case version, baseline, atau kandidat      |
| Test Result    | Satu Result immutable per Run                                                                                              | Immutability sudah kuat dan harus dipertahankan                                           |
| Evidence       | Attachment dan HTTPS evidence link tersedia, tetapi input masih opsional dan link dapat ditambahkan setelah Result selesai | Gate baru membutuhkan evidence wajib, previewable, dan manifest yang dibekukan            |
| Bug            | Bug menunjuk failed/blocked Result; Developer resolve; QA/Admin/Owner dapat verify/reopen                                  | Perubahan status retest belum wajib menunjuk Result retest baru                           |
| Coverage       | Test Case memetakan Requirement                                                                                            | Satu Test Case dapat membuat Requirement terlihat covered tanpa membuktikan seluruh AC    |
| Readiness      | Backend memakai Run terbaru per Test Case dan Feature-derived Requirement links                                            | Reusable Requirement/Test Case berisiko memindahkan bukti antar-Feature                   |
| Notification   | Pengiriman langsung dilakukan setelah transaksi; Release Decision terutama menarget reporter/assignee root Task            | Tidak menjamin QA signer dan semua Developer menerima handoff; retry/deduplikasi terbatas |
| Legacy         | Record lama tidak memiliki scope baru                                                                                      | Backfill hanya boleh dilakukan jika relasi dapat dibuktikan deterministik                 |

## 3. Keputusan desain

### 3.1 Keputusan dari pengguna

- QA assignee menjadi satu-satunya eksekutor normal QA.
- PO mereview/mengaktifkan Test Case dan membuat Release Decision.
- Owner/Admin tidak mengeksekusi pengujian normal.
- Owner/Admin memakai break-glass eksplisit untuk keadaan darurat.
- PO tidak dapat mengubah status Subtask QA.
- Test Run wajib memiliki scope Feature dan QA Subtask.
- Retest Bug wajib menghasilkan evidence immutable.
- Result `passed` wajib memiliki evidence image/video yang dapat dibuka langsung. Bug mewarisi
  tampilan evidence Result asal, dan setiap Retest Attempt wajib mempunyai evidence yang terlihat.
- Evidence gate penyelesaian QA diaktifkan setelah scope dan retest formal tersedia.
- Release Decision memberitahu QA signer dan Developer terkait.

### 3.2 Keputusan coverage yang direkomendasikan

Gunakan **dua lapis coverage**, bukan memilih salah satu secara eksklusif:

1. **Requirement coverage** tetap dipertahankan untuk ringkasan portfolio dan kompatibilitas.
2. **Acceptance Criterion coverage** menjadi release gate kanonikal. Setiap AC `active` dalam
   baseline Feature wajib dipetakan ke sedikitnya satu versi Test Case aktif dan memiliki latest
   Result `passed` pada Test Cycle/kandidat yang sedang dinilai.

AC yang sengaja tidak berlaku harus dikeluarkan melalui baseline/scope decision berversi dengan
alasan; bukan ditandai passed, skipped, atau dihilangkan dari denominator. Ini mencegah satu happy-path
Test Case membuat Requirement multi-AC terlihat selesai.

### 3.3 Penambahan untuk kesiapan industri

- **Versioned Test Case:** Test Run menunjuk versi definisi immutable. Perubahan langkah, expected
  result, test data, atau mapping AC menghasilkan revisi draf baru; histori Run tetap bermakna.
- **Test Cycle / Release Candidate:** kumpulkan Run untuk satu Feature, QA Subtask, baseline,
  kandidat/build, dan environment yang dibekukan. Sign-off menunjuk cycle tersebut.
- **Candidate fingerprint:** identitas kandidat minimum berasal dari build identifier dan environment;
  bila tersedia tambahkan commit SHA/deployment ID/config version non-secret. Perubahan fingerprint
  membuat sign-off lama tidak berlaku untuk keputusan baru.
- **Transactional outbox:** activity dan event notifikasi dibuat dalam transaksi bisnis yang sama;
  worker melakukan retry, deduplikasi, dan mencatat delivery status tanpa membatalkan mutasi utama.
- **Idempotency dan concurrency:** mutation penting menerima idempotency key, menggunakan row lock/
  unique constraint, dan mencegah dua Result, dua outcome Retest Attempt, atau dua keputusan aktif.
- **Risk-based control:** Bug Critical/High memerlukan evidence retest dan regression scope. Untuk
  Critical, verifikator tidak boleh menjadi pelaksana break-glass atau Release Decision pada kandidat
  yang sama.
- **Supersession, bukan rewrite:** pembatalan, invalidasi, perubahan baseline, dan perubahan kandidat
  membuat record baru yang merujuk record lama; histori tidak diedit.
- **Sealed evidence manifest:** saat Result difinalisasi, daftar attachment/link, actor, timestamp,
  media kind, provenance, dan availability dibekukan dalam manifest. Tambahan setelah seal menjadi
  supplement append-only dengan alasan dan tidak mengubah bukti asli secara diam-diam.
- **Controlled preview:** attachment dibuka melalui endpoint terautentikasi atau signed URL singkat;
  external link harus HTTPS, lolos allowlist/SSRF protection, dan menyimpan status availability.
  Stored attachment lebih dipercaya daripada external link yang dapat berubah atau hilang.

## 4. Model domain target

```text
Feature / Story
  ├── Feature Readiness Baseline
  ├── QA Subtask (assigned QA)
  ├── Test Case
  │     └── Test Case Version ── maps ──> Acceptance Criteria snapshot
  ├── Test Cycle / Release Candidate
  │     └── Test Run
  │           └── immutable Test Result + sealed Evidence Manifest
  ├── Bug ── originates from ──> failed/blocked Test Result
  │     ├── Developer Resolution Event
  │     └── Bug Retest Attempt ──> new immutable Test Result
  ├── QA Sign-off ──> frozen Test Cycle/readiness snapshot
  └── PO Release Decision ──> QA Sign-off + same candidate fingerprint
```

### Entitas dan perubahan minimum

| Entitas                                 | Perubahan yang direncanakan                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test_case_versions`                    | Snapshot immutable definisi, status/revision, author, publisher, timestamps, supersedes ID                                                                    |
| `test_case_version_acceptance_criteria` | Mapping Workspace-scoped ke AC dan snapshot versi/baseline                                                                                                    |
| `qa_test_cycles`                        | Feature, QA Subtask, baseline, candidate fingerprint, environment, status, owner QA                                                                           |
| `test_runs`                             | Tambah FK `feature_task_id`, `qa_subtask_id`, `test_cycle_id`, `test_case_version_id`; field baru nullable untuk legacy lalu wajib untuk Run baru             |
| `test_result_evidence_manifests`        | Satu manifest awal per Result dengan item count, sealedAt, provenance/availability summary, dan digest metadata; supplement berikutnya berversi dan beralasan |
| `bug_resolution_events`                 | Snapshot resolusi Developer, build/candidate target, notes, evidence; append-only                                                                             |
| `bug_retest_attempts`                   | Bug, resolution event, Run, Result, QA actor, outcome, notes, timestamps; unique dan append-only                                                              |
| `qa_execution_overrides`                | Scope aksi/Feature/Subtask/Cycle, reason, issuer, executor, expiry, usedAt/cancelledAt, audit metadata aman                                                   |
| notification outbox/delivery            | Event key, recipient, channel, attempt, status, next retry; gunakan model notification yang ada bila kontraknya memadai                                       |

Semua FK membawa `workspace_id` atau constraint komposit yang membuktikan isolasi Workspace.
Jangan memakai relasi polymorphic universal. Test Result yang sudah ada tidak diubah atau dihapus.

## 5. State machine dan invariant

### Test Cycle

`planned → in_progress → completed → signed_off`

- `planned/in_progress → cancelled` diperbolehkan dengan alasan.
- Perubahan baseline, candidate fingerprint, Test Case version, atau environment yang material membuat
  cycle `superseded`; QA membuat cycle baru.
- Cycle hanya menerima Run dari Feature, QA Subtask, baseline, dan kandidat yang sama.

### Test Result dan evidence

- `passed`, `failed`, dan `blocked` wajib memiliki sedikitnya satu evidence image/video berupa
  attachment persisten atau HTTPS link yang dapat dipreview. `skipped` wajib memiliki alasan tetapi
  tidak boleh dihitung sebagai pass.
- Finalisasi Result dan penyegelan manifest terjadi dalam satu transaksi. Evidence yang gagal
  provenance check, tidak didukung, restricted, atau broken tidak memenuhi evidence gate.
- External link tetap menyimpan URL/providernya, tetapi readiness snapshot juga merekam availability
  saat gate dihitung. Link yang kemudian rusak tidak menulis ulang snapshot lama dan menghalangi
  sign-off baru sampai diremediasi.
- Bug menampilkan satu timeline evidence tanpa menyalin blob: Result asal → evidence triage Bug →
  Resolution Event Developer → Retest Attempt 1..n. Setiap item menampilkan actor, waktu, build,
  environment, candidate fingerprint, status, dan sumber evidence.
- Klik thumbnail/nama evidence membuka image/video langsung di Evidence Preview; download/open-new
  hanya menjadi fallback terotorisasi. UI menampilkan `ready`, `restricted`, `unsupported`, atau
  `failed` secara jujur dan tidak membuat URL palsu.

### Bug dan Retest Attempt

`open/reopened → in_progress → resolved → retest_pending`

- Developer menghasilkan Resolution Event saat resolve.
- QA memulai Run baru dalam Test Cycle yang sama atau cycle pengganti yang valid.
- Setiap Retest Attempt wajib menunjuk Result baru dengan sealed Evidence Manifest; evidence dari
  attempt sebelumnya tetap terlihat dan tidak ditimpa.
- Result `passed` memungkinkan Retest Attempt `verified`.
- Result `failed` atau `blocked` memungkinkan Retest Attempt `reopened`.
- `skipped` tidak dapat menutup Bug. Hasil `blocked` harus mengembalikan Bug atau mempertahankan
  status menunggu sesuai keputusan kebijakan sebelum implementasi.
- Transisi Bug dan pembuatan Retest Attempt terjadi dalam satu transaksi. Endpoint status bebas
  `resolved → verified/reopened` dihentikan setelah cutover.

### Gate penyelesaian Subtask QA

Backend menerima `in_progress → done` hanya jika:

1. ada Test Cycle aktif untuk Feature dan QA Subtask tersebut;
2. semua AC aktif dalam baseline memiliki Test Case version aktif;
3. semua Test Case release-scope memiliki latest Result pada cycle/kandidat yang sama;
4. seluruh latest Result `passed`;
5. setiap Result yang dihitung mempunyai sealed evidence image/video yang masih `ready`;
6. tidak ada Run `in_progress`;
7. tidak ada Bug Critical/High selain `verified`, dan setiap verification memiliki Retest Attempt
   serta sealed evidence;
8. tidak ada Bug Medium/Low yang masih terbuka kecuali memiliki risk acceptance berversi dari PO;
9. tidak ada break-glass yang kedaluwarsa atau evidence dengan provenance tidak valid.

Jika gate gagal, API mengembalikan daftar kode alasan backend. UI tidak menghitung ulang aturan.
Reopen `done → in_progress` tetap membutuhkan alasan dan membuat sign-off/cycle berikutnya dievaluasi
ulang; histori sebelumnya tidak dihapus.

## 6. Authorization target

| Aksi                             | Owner/Admin                             | PO        | QA assignee | QA lain                            | Developer assignee    |
| -------------------------------- | --------------------------------------- | --------- | ----------- | ---------------------------------- | --------------------- |
| Baca Test Case/Run/Result        | Ya                                      | Ya        | Ya          | Ya sesuai Workspace                | Ya sesuai scope kerja |
| Buat/edit draf Test Case         | Break-glass                             | Tidak     | Ya          | Tidak                              | Tidak                 |
| Submit Test Case review          | Break-glass                             | Tidak     | Ya          | Tidak                              | Tidak                 |
| Request revision/publish/archive | Kelola                                  | Ya        | Tidak       | Tidak                              | Tidak                 |
| Ubah status QA Subtask           | Break-glass                             | Tidak     | Ya          | Tidak                              | Tidak                 |
| Buat Run/Result/evidence         | Break-glass                             | Tidak     | Ya          | Tidak                              | Tidak                 |
| Buat Bug                         | Kelola triage; bukan eksekusi normal    | Read-only | Ya          | Tidak, kecuali reassigned          | Tidak                 |
| Resolve Bug                      | Tidak                                   | Tidak     | Tidak       | Tidak                              | Ya                    |
| Retest verify/reopen             | Break-glass                             | Tidak     | Ya          | Tidak                              | Tidak                 |
| QA Sign-off                      | Tidak saat normal                       | Tidak     | Ya          | QA yang diberi assignment sign-off | Tidak                 |
| Release Decision                 | Ya, bila bukan signer/override executor | Ya        | Tidak       | Tidak                              | Tidak                 |

### Break-glass

- Bukan role global dan tidak membuka seluruh fitur QA.
- Dibatasi satu Workspace, Feature, QA Subtask/Test Cycle, daftar aksi, executor, dan masa berlaku
  pendek; reason wajib.
- Owner/Admin tidak boleh mengesahkan sendiri grant yang akan dipakainya untuk Bug Critical atau
  Release Decision kandidat yang sama. Minimal ada second-party approval untuk tindakan berisiko.
- Pemakaian satu kali bersifat atomik, append-only, diberi notifikasi kepada QA assignee/PO/Owner,
  dan terlihat di audit serta readiness snapshot.
- Ketika QA tersedia kembali, override dapat dicabut tanpa mengubah evidence yang sudah tercatat.

## 7. Kontrak API yang direncanakan

Nama endpoint final dikunci pada slice kontrak; bentuk berikut menunjukkan tanggung jawabnya:

- Test Case revisions: create draft revision, submit, request changes, publish, supersede/archive.
- Test Cycle: create, start, read state, cancel/supersede, list readiness reasons.
- Scoped Run: create dengan `featureTaskId`, `qaSubtaskId`, `testCycleId`, dan
  `testCaseVersionId`; Result tetap append-only.
- Result finalization: kirim evidence image/video bersama outcome, validasi preview/provenance, lalu
  segel Evidence Manifest secara atomik. Supplement evidence memakai command terpisah dengan alasan.
- Bug resolution: membuat Resolution Event, bukan menimpa satu field mutable sebagai satu-satunya
  histori.
- Retest: create attempt dari resolved Bug dan scoped Run/Result; endpoint menentukan outcome dari
  Result, bukan menerima outcome bebas dari browser.
- QA Subtask completion: memakai command khusus atau Task update yang memanggil gate service yang
  sama; tidak ada bypass melalui endpoint generik.
- Break-glass: request/grant/use/cancel dengan reason, expiry, dan capability response backend.
- Notification: read/acknowledge; delivery worker internal tidak diekspos sebagai privilege browser.

Semua create/command menerima idempotency key, memvalidasi active membership dan assignment saat
transaksi berlangsung, serta mengembalikan `403` untuk role, `409` untuk stale/superseded state,
dan `422` untuk evidence/gate yang belum lengkap secara konsisten.

## 8. Tahapan implementasi dalam vertical slice kecil

### S0 — Policy decision dan rekonsiliasi dokumentasi

- Buat ADR baru untuk separation of duties, break-glass, AC-level gate, Test Case versioning,
  formal retest, candidate identity, dan notification delivery.
- Selaraskan Architecture, Workflow, Policy Registry, Feature Card, onboarding, dan role matrix.
- Petakan endpoint/UI yang masih mengizinkan Planner menjalankan QA.
- **Diterima bila:** tidak ada konflik authority antar-SSoT; policy allow/deny dan legacy treatment
  eksplisit. Tidak ada perubahan runtime pada slice ini.

### S1 — Kunci eksekusi normal ke QA assignee

- Ubah backend policy lebih dahulu, lalu capability API dan UI.
- PO serta Owner/Admin tanpa grant mendapat `403` untuk QA Subtask execution, Run, Result, evidence,
  Bug execution, retest, dan Sign-off.
- Tambahkan break-glass ter-audit; sembunyikan aksi normal dan tampilkan banner konteks ketika aktif.
- **Diterima bila:** UI dan HTTP membuktikan setiap kombinasi role/assignment; direct API tidak dapat
  melewati pembatasan.

### S2 — Test Case versioning dan AC coverage

- Tambahkan revisi immutable dan mapping AC.
- Migrasikan Test Case aktif menjadi revision awal secara deterministik; mapping Requirement lama
  dipertahankan, AC legacy ditandai incomplete sampai dipetakan manusia.
- Publication membekukan revision; edit berikutnya membuat draft revision baru.
- **Diterima bila:** histori Run tetap menunjuk definisi lama; seluruh AC aktif terlihat mapped,
  unmapped, deprecated, atau explicitly excluded dengan alasan.

### S3 — Test Cycle dan scoped Test Run

- Tambahkan scope langsung pada Run serta Test Cycle/candidate fingerprint.
- Finalisasi Result mewajibkan evidence image/video dan sealed manifest yang dapat dibuka melalui
  jalur terautentikasi.
- Tolak Feature, Subtask, Test Case version, baseline, Workspace, build, atau environment yang tidak
  konsisten.
- Perbaiki readiness individual dan batch agar hanya memakai cycle/kandidat yang dinilai.
- **Diterima bila:** Test Case yang dipakai dua Feature tidak dapat memindahkan Result; failed latest
  Result tidak ditutupi pass lama atau kandidat lain.

### S4 — Bug Resolution Event dan Retest Attempt formal

- Simpan resolusi Developer append-only dan kaitkan ke kandidat perbaikan.
- Hilangkan transisi QA status bebas; Retest service membuat outcome dari Result immutable.
- Tampilkan timeline evidence awal, resolusi, dan seluruh Retest Attempt tanpa menyalin evidence asal.
- Buat antrean QA berdasarkan Resolution Event terbaru yang belum memiliki final Retest Attempt.
- **Diterima bila:** concurrent verify/reopen hanya menghasilkan satu outcome; Result passed/failed/
  blocked/skipped mengikuti invariant; Retest tanpa evidence ditolak; semua attempt lama tetap dapat
  dibuka; Developer tidak dapat menutup Bug.

### S5 — Evidence gate QA, Sign-off, dan Release Decision

- Aktifkan gate QA Subtask setelah data S2–S4 lengkap pada Workspace pilot.
- Tolak completion/sign-off bila evidence wajib belum sealed, tidak dapat dipreview, atau berasal
  dari Feature/candidate lain.
- QA Sign-off menunjuk Test Cycle dan frozen readiness snapshot.
- Release Decision wajib menunjuk latest active Sign-off dengan candidate fingerprint yang sama.
- Perubahan scope/candidate setelah Sign-off membuatnya stale, bukan menghapus histori.
- **Diterima bila:** semua bypass endpoint ditolak; override bisnis menyimpan failed gates tetapi
  tidak dapat melewati integritas evidence atau separation of duties.

### S6 — Reliable cross-role notification

- Persist event outbox bersama transaction QA Sign-off/Release Decision/Bug handoff.
- Resolve recipient dari QA signer, QA assignee, seluruh Developer assignee pada Feature, PO/Owner
  terkait, dengan deduplikasi dan pengecualian actor.
- Retry dengan backoff, delivery status, dead-letter visibility, dan correlation/event key.
- **Diterima bila:** retry tidak menggandakan notification; kegagalan FCM/email tidak menghilangkan
  in-app notification; akses deep link tetap Workspace-scoped.

### S7 — Legacy remediation, pilot, dan enforcement

- Tambahkan mode `observe`, `warn`, lalu `enforce` per Workspace; default Production lama tetap aman.
- Backfill hanya scope/version yang deterministik. Record ambigu diberi `legacy_unscoped` dan tidak
  memenuhi gate baru.
- Pilot satu Feature kecil di Preview, lalu Workspace development yang disetujui. Rekonsiliasi angka
  bersama PO/Dev/QA sebelum enforcement Production.
- **Diterima bila:** backup/recovery, clean migration, upgrade migration, rollback aplikasi, audit,
  desktop/mobile, dan UAT lintas peran terbukti; keputusan rollout eksplisit.

## 9. Berkas yang kemungkinan berubah

| Area              | Lokasi                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| SSoT/policy       | `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/POLICY_REGISTRY.md`, ADR baru                                   |
| Shared contracts  | `packages/contracts/src/testManagement.ts`, `bug.ts`, `releaseDecision.ts`, `requirement.ts`, `notification.ts`, `workQueue.ts` |
| Models/migrations | `apps/api/src/db/models/`, `apps/api/src/db/migrations/`, association/index definitions                                         |
| Authorization     | `apps/api/src/policies/testManagementPolicy.ts`, `bugPolicy.ts`, `releaseDecisionPolicy.ts`, task policy                        |
| Services          | `apps/api/src/modules/testManagement/`, `bugs/`, `releaseDecisions/`, `workQueue/`, notification service/outbox worker          |
| Frontend          | `QaTestingDesk.tsx`, `TestCaseFormModal.tsx`, `BugExperiencePanel.tsx`, `ReleaseAssurancePanel.tsx`, My Tasks queues            |
| Evidence          | Policy, contract, PostgreSQL integration, UI interaction/accessibility tests, reports, migration/runbook scripts                |

File final dikonfirmasi ulang pada awal setiap slice. Jangan memindahkan modul atau membuat framework
baru hanya untuk mengikuti nama konsep dalam plan.

## 10. Risiko migrasi dan rollout

- Gunakan migrasi additive: tabel/FK/index baru, kolom nullable untuk legacy, lalu enforce untuk write
  baru melalui service sebelum constraint diperketat.
- Hindari default/backfill yang merekayasa `featureTaskId`, QA assignee, AC mapping, kandidat, atau
  Retest Result. Simpan provenance dan versi backfill bila nilai deterministik.
- Jalankan clean migration dan upgrade dari fixture realistis yang mengandung reusable Requirement,
  duplicate retry, canceled sign-off, reassignment QA, dan Run legacy tanpa scope.
- Tambahkan index Workspace + status/assignee/cycle untuk antrean; ukur query plan sebelum Production.
- Perluas guard penghapusan Task, Requirement, AC, Test Case, attachment, dan Workspace terhadap
  seluruh relasi evidence baru.
- Rollback aplikasi harus tetap dapat membaca schema additive. Down migration tidak dijalankan
  otomatis; recovery database mengikuti backup tervalidasi dan runbook terpisah.

## 11. Validasi dan bukti wajib

- **Contract:** seluruh payload, enum, error, idempotency, legacy/unavailable state.
- **Policy:** matriks allow/deny lengkap, assignment check, anti-self-approval, break-glass expiry/
  scope/single-use, direct HTTP bypass.
- **PostgreSQL:** clean/upgrade migration, Workspace isolation, FK, unique constraint, transaction
  rollback, concurrent Result/retest/sign-off/release commands, append-only audit.
- **Readiness regression:** reusable Test Case lintas Feature, kandidat berubah, baseline/AC berubah,
  latest failed Result, blocked/skipped, canceled/superseded cycle, critical/high Bug.
- **Evidence:** passed/failed/blocked tanpa media ditolak; image/video attachment dan HTTPS link dapat
  dipreview; cross-Workspace/cross-Feature provenance ditolak; broken/restricted evidence menggagalkan
  sign-off baru; supplement tidak mengubah manifest awal; seluruh Retest Attempt tampil berurutan.
- **Notification:** recipient completeness, deduplication, retry, actor exclusion, dead-letter,
  unauthorized deep link.
- **Frontend:** loading, empty, error/retry, permission-denied, stale state, disabled gate, break-glass
  warning, desktop/mobile, light/dark, keyboard/focus/touch target.
- **UAT:** PO tidak bisa mengeksekusi QA; Owner/Admin normal read-only; QA non-assignee ditolak; QA
  assignee menyelesaikan cycle; Dev resolve; QA retest; QA sign-off; PO release; seluruh record dibaca
  kembali melalui API terotentikasi.

Perintah akhir setiap slice mengikuti repository validation. PostgreSQL harus disposable dan memakai
migrasi kanonikal. Laporan mencatat jumlah pass/fail/skipped, warning, environment, dan known gap;
frontend fixture tidak menggantikan bukti persistensi.

## 12. Urutan keputusan dan Definition of Done

Urutan rekomendasi: **S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7**. S6 dapat mulai setelah event
contract S3/S4 stabil, tetapi enforcement S5 tetap menunggu scope dan retest formal.

Program selesai hanya bila:

- policy dan implementasi tidak lagi memberi izin QA implisit kepada Planner;
- setiap Result dan Retest dapat ditelusuri ke Feature, QA assignee, Test Case version, AC baseline,
  kandidat, build, dan environment;
- setiap Result yang relevan mempunyai sealed evidence image/video yang dapat dibuka; Bug
  memperlihatkan evidence asal, resolusi, dan semua retest secara kronologis;
- penyelesaian QA, Sign-off, dan Release Decision memakai evidence snapshot yang sama;
- tidak ada cross-Feature evidence leakage atau transisi Bug tanpa Retest Result;
- break-glass sempit, kedaluwarsa, ter-audit, dan tidak menghasilkan self-approval;
- notification handoff persisten dan dapat direkonsiliasi;
- legacy tetap terbaca tanpa dipalsukan sebagai evidence baru;
- seluruh validasi, migration rehearsal, UAT, rollout decision, dan recovery evidence tercatat.
