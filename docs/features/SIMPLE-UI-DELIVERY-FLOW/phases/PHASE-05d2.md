# SIMPLE-UI-P5d-2 — Apply atomik dari Feature Spec

**Status:** Disetujui Owner (chat, 2026-11-02, "setuju"); kandidat Test & Review, 2026-11-03.
**Feature:** SIMPLE-UI-DELIVERY-FLOW · **Tahap:** 5/6 Test & Review · **Jalur:** Penuh untuk program.
**AC:** AC-5.6 Apply, AC-5.2 kelengkapan, AC-5.3 versi/audit, AC-5.7 izin.
**Policies:** AI-001, AI-013, AI-020, AUTH-001, AUTH-002, DOMAIN-002, DOMAIN-003, DOMAIN-004,
DATA-001, DATA-006, CONTRACT-001, TEST-001, DOC-003, SDLC-001, SDLC-002.

## Approval Window dan WRA

- Task `SIMPLE-UI-P5d-2`; baseline `fbb1308d5e8083d1f5f052902eef14c494259ac7` (main setelah PR #95).
- Branch `codex/simple-ui-p5d2-apply`; berlaku sampai merge atau dibatalkan Owner.
- Path: kontrak/tes Feature Spec di `packages/contracts/src/featureSpec*`, modul API `featureSpecs`,
  penulis transaksi Apply dan tes terkait di modul `ai`, dokumen Feature ini dan status TODO terkait.
- Urutan: klaim fase → implementasi → PostgreSQL/HTTP dan regresi → quality/review terpisah →
  dokumentasi/status → commit, push branch, PR dan tiered auto-merge. Tier dihitung dari diff final;
  label Owner tidak pernah dipasang/dicopot agent.
- Di luar scope: UI produksi/P5e, open assignment/P5g, RBAC/policy, dependency, AI provider/model/
  key/prompt, migrasi, penghapusan data manual, deployment atau mutasi data Production.
- WRA **8/16** (1,1,1,1,1,1,2,0), Ready untuk scope yang disetujui. AC mempunyai jalur E2/E3;
  Node 24 dan PostgreSQL lokal tersedia. Tidak perlu Gemini atau browser untuk AC server-only ini.
  Review terpisah tetap wajib; penerimaan belum diklaim sebelum evidence tersedia.

## Fakta, keputusan, dan dampak

Spec sudah memiliki root Feature dan kolom fingerprint unik. Apply lama membuat root baru dan
menulis Brief/Requirement/AC/subtask di transaksi sendiri. Tidak ada endpoint Apply Spec pada
baseline. Shared writer akan menerima transaksi pemanggil; perilaku kontrak Apply lama dipertahankan.

Decision Snapshot yang disetujui: berbagi penulis transaksi (menghindari duplikasi, perlu regresi
dua jalur) dipilih dibanding implementasi Apply kedua yang terpisah (lebih terisolasi, menggandakan
penulisan). Apply Spec memakai root yang sama. Brief context kosong memakai Plan problem sesuai
ADR-036; Brief tetap draft, tidak otomatis disetujui. Root title/priority/jadwal mengikuti Plan.
Requirement/AC dan link subtask mengikuti kunci Spec secara tepat, bukan semua-ke-semua.

`POST …/feature-specs/:specId/apply` menerima versi dan idempotencyKey. Versi/key sama mengembalikan
hasil sebelumnya tanpa penulisan ulang; versi/key berbeda sesudah Apply adalah 409. Row Spec dan root
dikunci. Root dengan Brief primer, link Requirement, atau subtask manual ditolak 409 agar tidak
menimpa data. Fase ini hanya `assigned` dengan assignee yang valid; `open` ditolak sampai P5g.
Semua section divalidasi ulang; input tidak lengkap 400 dengan missingFields. Status `applied`,
versi/snapshot, fingerprint, receipt Apply, dan audit harus commit bersama hasil delivery.

Change Impact Map: **Cross-boundary change** — shared contract → controller/route Planner → service
Spec → penulis transaksi bersama Apply lama → Brief/Requirement/AC/Task/link/audit. Tidak ada perubahan
hak peran atau frontend. Spec 1:1 root; Requirement milik Workspace, link many-to-many; AC 1:N
Requirement; subtask hanya satu tingkat. FK/lifecycle/index yang ada dipertahankan. Tidak ada migrasi.
Keunikan fingerprint dan index Spec/root digunakan; query/link dibatasi ukuran schema Spec.
Query count/latency dicatat secara proporsional, tanpa klaim performa skala besar.

Keputusan tambahan Owner (chat, 2026-11-03): scope Spec dapat mencapai 5.000 karakter sedangkan
butir Brief maksimal 2.000. Dipilih pembagian menjadi butir berurutan dengan seluruh isi teks,
dibanding menolak Apply sampai pengguna mempersingkat scope. Pemisahan mengikuti whitespace bila
memungkinkan, tidak memutus pasangan surrogate Unicode; whitespace batas butir dinormalisasi
seperti input Brief yang ada. Batas diambil dari kontrak Brief, tidak mengubah schema.

Risiko: regresi Apply lama, receipt tidak idempoten, race pada versi, penulisan parsial, atau
tautan salah. Mitigasi: shared writer bertransaksi, lock, receipt snapshot, backend guardrail, dan
tes PostgreSQL autentikasi/readback/concurrency/rollback. Pemulihan melalui revert commit tanpa
menghapus data UAT atau mengubah schema; transaksi gagal harus meninggalkan root/Spec seperti semula.

## AC → evidence yang akan dijalankan

| Target                                                             | Evidence                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| AC-5.6 Apply ke root sama, Brief/Requirement/AC/subtask/link benar | HTTP autentikasi, readback, inspeksi row PostgreSQL                                    |
| Idempotensi dan klik/permintaan serentak                           | Satu hasil, counts/UUID tidak bertambah; key/versi berbeda 409                         |
| Gagal sebagian berarti nol perubahan                               | Kegagalan nyata tengah transaksi, assert seluruh row/versi/audit rollback              |
| AC-5.2 kelengkapan, jadwal, assignee dan mode                      | 400 + missingFields/validation; guardrail anggota/area; open ditolak                   |
| AC-5.3 snapshot/audit/read-only                                    | Versi N→N+1, receipt dan actor/via tersimpan, replay tidak menambah audit              |
| AC-5.7 authorization/Workspace                                     | Izin Owner/Admin/PO, 401/403 dev/QA/nonmember, scope lintas Workspace                  |
| Regresi/reuse                                                      | Apply lama, seluruh Feature Spec, kontrak, validate/build/docs, CI dan review terpisah |

## Task dan Outcome

`SIMPLE-UI-P5d-2`: kandidat endpoint Apply sudah diimplementasikan. HTTP/PostgreSQL membuktikan
17 skenario: delivery ke root sama, receipt replay sesudah delivery diedit, dua request identik,
dua key berbeda, Save versus Apply, tahap belum lengkap/Plan berubah, scope panjang/Unicode,
401/403, izin Owner/Admin/PO, Workspace/forged body IDs, validasi input/versi, missingFields,
mode/jadwal/kunci, assignee/peran/spesialisasi, konten manual/recoverable, rollback penyimpanan
Brief nyata, dan sinkronisasi Plan/context. Bukti ini E3 lokal, bukan Apply Production.

Fingerprint tidak menyimpan key mentah. Snapshot versi terapan menyimpan receipt immutable;
replay tidak membaca ulang data delivery yang mungkin sudah diubah. Shared writer tidak membuka
transaksi sendiri. UUID kode Requirement menghilangkan benturan kode berbasis waktu; batas kolom
dan kontrak lama tetap dipenuhi. Tidak ada endpoint atau struktur data lama yang dihapus.

## Source of truth dan Changed files

Entry point [Knowledge Map](../../../0_PRODUCT_KNOWLEDGE_MAP.md); aturan domain/Workspace/relasi
[Architecture](../../../1_ARCHITECTURE.md); role flow [Workflow](../../../2_WORKFLOW_AND_ROLES.md);
assurance [Agent Guidelines §2A](../../../4_AGENT_DEV_GUIDELINES.md#2a-protokol-ai-work-assurance);
keputusan Feature Spec [ADR-036](../../../adr/ADR-036-FEATURE-SPEC-REQUIRED-FIELDS-AND-AGENT-READY-WRITES.md).
AC dan scope tetap di [product.md](../product.md), [breakdown.md](../breakdown.md), serta Approval
Window di atas. Tidak ada perubahan policy atau schema/migrasi.

| File/grup                                                                                           | Perubahan                                                   |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/contracts/src/featureSpec.ts` dan tesnya                                                  | Input strict, receipt dan response bersama                  |
| `apps/api/src/modules/featureSpecs/featureSpec{Service,Controller,Routes}.ts`                       | Apply berizin, validasi ulang, lock/transaksi/receipt/audit |
| `apps/api/src/modules/featureSpecs/__tests__/featureSpecApplyApiIntegration.test.ts` dan route test | HTTP/PG/kontrak, concurrency dan rollback nyata             |
| `apps/api/src/modules/ai/aiTaskDraftPersistence.ts`, `aiTaskGeneratorService.ts`                    | Ekstraksi shared writer, jalur lama tetap kompatibel        |
| Feature README/contracts/authorization/testing/breakdown/phase dan `TODO.md`                        | Kontrak endpoint, scope keputusan, bukti dan status terkait |

## Validation

Environment: macOS lokal, Node **24.15.0**, PostgreSQL **16**, database disposable
`qlickhub_p5d2_test_20261102`, migrasi kanonis. `TEST_DATABASE_URL` diisi hanya di environment
eksekusi, tidak disalin ke repo. Jalur tes memakai akun/session/workspace fixture persisten dengan
cleanup ter-scope; bukan data Production. Panggilan AI tidak dibutuhkan untuk Apply. Suite AI yang
ada memakai external seam test yang sudah tersedia, bukan bukti Gemini asli baru.

| Perintah aktual (Node 24; database tes dari environment)                                                                                                                                                                            | Hasil                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV=test npm --prefix apps/api run db:migrate:test`                                                                                                                                                                           | Exit 0; 77 migrasi pada database bersih                                                                                         |
| `npm --prefix packages/contracts run test`                                                                                                                                                                                          | Exit 0; 109 pass, 0 fail, 0 skip                                                                                                |
| `NODE_ENV=test node --import tsx --test apps/api/src/modules/featureSpecs/__tests__/featureSpecApplyApiIntegration.test.ts`                                                                                                         | Pengulangan awal exit 0; 14/14 sebelum tambahan 3 skenario                                                                      |
| `NODE_ENV=test node --import tsx --test apps/api/src/modules/featureSpecs/__tests__/*.test.ts apps/api/src/modules/ai/__tests__/aiTaskGeneratorIntegration.test.ts`                                                                 | 83/84; satu fixture scope >5.000 karakter diperbaiki menjadi input valid; semua 17 skenario berikutnya lulus di suite API penuh |
| `npx eslint apps/api/src/modules/featureSpecs apps/api/src/modules/ai/aiTaskDraftPersistence.ts apps/api/src/modules/ai/aiTaskGeneratorService.ts packages/contracts/src/featureSpec.ts packages/contracts/src/featureSpec.test.ts` | Exit 0; 0 error, 0 warning                                                                                                      |
| `npm run build`                                                                                                                                                                                                                     | Exit 0; contracts, API, web dibangun                                                                                            |
| `npm run docs:check`                                                                                                                                                                                                                | Exit 0; 12/12 dan pemeriksaan dokumen                                                                                           |
| `NODE_ENV=test npm --prefix apps/api run test:integration`                                                                                                                                                                          | Exit 0; **620 pass / 0 fail / 0 skip**, 126 suites, 112.4 detik; termasuk 17 Apply baru dan 8 regresi generator/Apply lama      |

`npm run validate` final: exit 0; docs 12, docsys 29, env 5, SDLC 10, agent policy 22, tier 5
seluruhnya pass/0 fail/0 skip. Theme/typecheck lulus; lint 0 error, 15 warning di luar diff.
`npm run docs:completeness`: exit 0; 88 gap baseline, 0 gap baru.

Outcome gagal tidak dihapus: uji pertama 12/14 gagal karena tes membaca status dari version Brief
(status sebenarnya di document) dan factory subtask manual tidak menyertakan folder root.
Keduanya disesuaikan dengan kontrak/constraint yang sudah ada tanpa mengubah aturan produk.
Tambahan tes sempat gagal typecheck karena factory Spec tidak mengisi idea dan JSON error belum
diparse; diperbaiki lalu build lulus. Sandbox sempat menolak port PostgreSQL/portal lokal; eksekusi
ulang dengan akses lokal yang disetujui. Tidak ada tes dinonaktifkan atau assertion diperlemah.
Suite API penuh dan validate final lulus. CI dan tier dicatat setelah tersedia. Log 500 pada fault
fixture Brief adalah hasil yang diharapkan untuk membuktikan rollback; bukan tes gagal. Pesan FCM
skipped/no active device tokens berasal dari fixture tanpa token push; bukan test yang di-skip.
Suite mengeluarkan 9 peringatan pg tentang query bersamaan dari jalur yang sudah ada; query
count baru pada transaksi Apply sudah dibuat berurutan. Tidak ada upgrade dependency dalam scope.

## Quality review dan cross-layer gates

| Dimensi                  | Metode, temuan dan hasil                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reuse/DRY                | Diff Apply lama vs writer baru; Requirements/AC/Brief satu writer; Spec memakai canonical Task helper dan completeness/date/Brief contracts. Resolved.                                           |
| Duplikasi/tumpang tindih | Pencarian call sites/import; dua endpoint memiliki identitas root berbeda yang disengaja, penulisan konten dibagi. Cabang legacy menjaga kontrak lama; tidak ditemukan persistence paralel baru. |
| Usang/tidak dipakai      | Diff/import/export dan lint scope 0 warning; import model/Brief lama dihapus, writer dipanggil kedua service. None found pada scope perubahan.                                                   |
| Boundary/best practice   | Strict contract; route dan service Planner; Workspace lock/replay; satu transaksi; fixture PostgreSQL trigger hanya Workspace tes, selalu dihapus dalam finally. None found.                     |
| Regresi/dokumentasi      | 17 skenario baru dan regresi Apply lama lulus pada log suite; kontrak/authorization/testing diperbarui. Hasil final global/CI dicatat terpisah.                                                  |

Relasi tetap: Spec 1:1 root, snapshot 1:N Spec, Requirement 1:N AC, root/subtask N:M Requirement,
Brief primary link dan versi dokumen, subtask satu tingkat mewarisi folder. FK/lifecycle/index
kanonis tidak diubah. Root manual/recoverable dilindungi. Query lock/count scoped oleh id/Workspace,
memakai index Spec/root/link yang ada; jumlah write/validasi tumbuh sesuai Requirement/subtask
(batas schema: 100 Requirement, 200 subtask), tidak ada read seluruh Workspace pada Apply.
Canonical Task helper tetap melakukan validasi per subtask. Fixture 2 Requirement/2 subtask mencatat
Apply + authenticated readback **110 ms**; bukan benchmark kapasitas atau janji latency. Tidak ada
query plan/skala maksimum yang diklaim. UI/responsif/Atomic N/A karena tidak ada perubahan frontend;
AI model/provider N/A karena tidak dipanggil oleh Apply.

## Agent handoff dan independent verification

Baseline `fbb1308`; pelaksana Codex. Reviewer terpisah memeriksa diff dan file baru, SSoT, kontrak,
implementasi dan log primer; bukan menerima ringkasan pelaksana sebagai bukti.

| Axis      | Verifier                | Hasil 2026-11-03                         | Batas                                                                                                 |
| --------- | ----------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Standards | `p5d2_standards_review` | **Accepted**, 0 blocking findings        | Review kode/kontrak/dokumen; tidak mengklaim CI yang belum berjalan                                   |
| Spec      | `p5d2_spec_review`      | **Accepted** setelah log 17/17 diperiksa | Review awal Accepted with gaps karena fixture scope, lalu gap ditutup; hasil global/CI belum termasuk |

Satu perilaku nonblocking didokumentasikan reviewer: notifikasi assignment setelah commit yang
ada di `createTaskImpl` tidak dijalankan oleh Apply yang memakai transaction helper. Tidak ada AC
atau aturan SSoT yang mewajibkannya untuk fase ini; audit tetap ada dan Apply lama tidak berubah.
Tidak menutup backlog remediasi modal lama maupun gap predicate AI yang diterima di P5d-1.

## Risks, human decision summary, dan TODO update

Hasil yang dipercaya saat ini: kode/kontrak diterima review terpisah, 620 tes API (17 Apply baru)
lulus, build, 109 kontrak, dan validate final lulus. CI/auto-merge masih perlu dicatat sebelum
penutupan. Keputusan scope panjang telah diberikan Owner.
Rollback berupa revert PR, tanpa migrasi atau penghapusan data. `SIMPLE-UI-DELIVERY-FLOW` tetap
**In progress**; kandidat P5d-2 saja yang disiapkan untuk merge. P5e/P5f/P5g memerlukan window fase
masing-masing. Tidak ada deploy atau mutasi data Production.

**Stop condition G6:** pemeriksaan release menemukan bahwa merge ke main memicu deployment
Production (workflow CI, [deployment guide §6](../../../DEPLOYMENT_AND_ENVIRONMENTS.md#6-alur-rilis-production),
status Vercel pada commit main `fbb1308`: Deployment has completed). Window fase ini mengecualikan
deployment Production. [ADR-029 butir 5](../../../adr/ADR-029-STAGED-FEATURE-SDLC.md) mempertahankan
keputusan Owner terpisah bila Tier 1 auto-merge juga deploy Production; Agent Guidelines §2A.A.1
melarang mengasumsikan persetujuan. Karena itu commit/push/PR dan CI dapat diselesaikan, tetapi
auto-merge ditahan sampai Owner menyetujui dampak deployment untuk PR konkret yang ditinjau.
