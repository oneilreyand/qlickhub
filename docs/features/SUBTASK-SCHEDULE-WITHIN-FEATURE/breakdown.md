# SUBTASK-SCHEDULE-WITHIN-FEATURE — Tahap 3: Breakdown

**Status:** Disetujui
**Gerbang:** G3 — disetujui Owner 2026-11-07 untuk Phase 1 lokal
**Applicable Policy IDs:** AI-002, AI-009, AI-013, AI-014, SDLC-001, SDLC-002, TEST-001, DOC-002

## 1. Work Readiness Assessment dan scope

Persiapan dokumen: Ready 2/16 (external akun Git fetch 2, tujuh dimensi lain 0).
Akses source, scaffold, docs checker tersedia; tidak perlu kredensial, live API, PostgreSQL atau
browser Production untuk AC dokumentasi. Instruksi user 2026-11-07 mengotorisasi fetch → branch
baru dari main → scaffold → draft G0–G3 → docs checks → laporan → berhenti minta persetujuan.
Path mutasi saat ini hanya folder Feature ini, navigasi/katalog, item TODO F1, laporan rencana.
Tidak termasuk commit/push/PR/merge/build/deploy. Window berakhir pada handoff sebelum build.

Phase build: **6/16**, requirement 0 (K1/L1/L2 disetujui), lapisan 2, data/migrasi 0,
authorization 0, shared contract 1, ketersinggungan 1, validasi 2, eksternal 0.
Jalur Penuh karena lintas role/contract. **Ready** setelah K1/L1/L2, G0–G3 dan ADR-042/SSoT selesai;
Ketersediaan PostgreSQL disposable dan browser lokal telah dibuktikan di Phase 1. CI/independent reviewer
memeriksa primary evidence; belum ditunjuk sebagai sudah menerima implementasi.

## 2. Peta phase

Satu vertical slice lengkap, bukan pekerjaan semua BE lalu semua FE yang tidak terintegrasi.

| Phase | Hasil user                                                      | AC               | WRA  | Dependensi                 | Status                |
| ----- | --------------------------------------------------------------- | ---------------- | ---- | -------------------------- | --------------------- |
| P1    | Jadwal parent/child terlindungi, konflik jelas, legacy terlihat | AC-F1.1–AC-F1.12 | 6/16 | G0–G3; keputusan; ADR/SSoT | Kandidat lokal teruji |

## 3. Task per phase dan file perkiraan

| Task     | Layer | Pekerjaan                                                                                       | File/path perkiraan                                                                                                                                                                           | Bukti                                         | Assignee                                              |
| -------- | ----- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| F1-BE-1  | BE    | Guard transaksi bersama dan lock root, validasi root/child/Plan, metadata read, audit atomicity | tasks/internal/taskLifecycle.ts; helper baru tasks/internal/taskFeatureSchedule.ts; taskQuery.ts; featureSpecs/featureSpecService.ts; packages/contracts/src/task.ts                          | PostgreSQL/API semua AC kecuali UI-only       | Codex                                                 |
| F1-FE-1  | FE    | Batas tanggal/root/child dan penyajian 400/409 tanpa input hilang, termasuk Plan                | FeatureDetailPage.tsx; TaskDetailDrawer.tsx; taskDetail/TaskDetailOverviewTab.tsx; taskDetail/FeatureSpecPlanPanel.tsx; CreateSubtaskModal.tsx; SubtaskAccordionItem.tsx                      | Component, responsif, E2E                     | Codex                                                 |
| F1-FE-2  | FE    | Penanda legacy dari metadata server                                                             | SubtaskList.tsx; SubtaskAccordionItem.tsx; molekul badge bila reuse existing tidak memadai                                                                                                    | E2/E4, tanpa hitung bisnis client             | Codex                                                 |
| F1-QA-1  | QA    | Tes merah, write/readback, negative permission, concurrency, regression dan E2E                 | `tasks/__tests__/taskFeatureScheduleApiIntegration.test.ts`; suite Task dan Feature Spec existing; web component tests; apps/web/e2e/specs/                                                   | E3 semua AC; E2/E4 AC-F1.6/.11                | Codex pelaksana; verifier independen/CI dan Owner UAT |
| F1-DOC-1 | Docs  | ADR aturan baru, SSoT, kontrak dan Feature evidence setelah approval                            | docs/adr/ADR baru; docs/adr/README.md; docs/1_ARCHITECTURE.md bila hierarki perlu penjelasan; docs/2_WORKFLOW_AND_ROLES.md; docs/POLICY_REGISTRY.md bila identifier baru; Feature/TODO/report | Review Owner sebelum implementasi; docs:check | Codex/Owner                                           |

Path runtime pada tabel bersifat proposal; path API di bawah apps/api/src/modules/ dan UI di bawah
apps/web/src/components/ui/organisms/ kecuali disebut lengkap. Verifikasi file/import sebelum edit.
Jika kebutuhan keluar dari daftar atau kontrak error berubah material, kembali ke Owner.

## 4. AC-to-evidence dan Change Impact Map

Matriks setiap AC di [product.md](product.md) dan [testing.md](testing.md); minimum E3 untuk
mutasi/readback, E2 frontend dan E4 phone/tablet/desktop untuk workflow terkait.

Feature change pada planning → Task/Feature Spec service → transaction/queries → shared read
contract → UI form/badge → QA. Schema/migration dan izin tidak berubah. Rule domain baru harus
masuk ADR/SSoT; read query dan concurrency perlu bukti relasi/performanya. AI/model N/A.

## 5. Approval Window build lokal (disetujui 2026-11-07)

Setelah Owner menyetujui G0–G3 dan keputusan, verifikasi ulang baseline a717ba7 dan capability
Node 24, disposable PostgreSQL canonical migrations, browser lokal. Catat ADR/SSoT sebelum runtime.
Urutan lokal: test merah → guard/contract + UI slice → tes PostgreSQL/contract/component/E2E →
validate/build → independent review dan evidence. Path terbatas tabel P1.
Tidak ada push/PR/merge/deploy/Production mutation di window yang diajukan. Masa berlaku sampai
kandidat P1 dan laporan atau stop condition, lalu minta otoritas tahap berikutnya.

## 6. Risiko, recovery dan stop condition

- L1/L2 telah diputuskan; perubahan keputusan legacy/reopen berikutnya memerlukan Owner.
- Writer Plan/Apply bypass atau deadlock: guard bersama, urutan root lock tetap, tes dua koneksi.
- N+1/scan: query batch, ukur baseline/query count, inspect index/EXPLAIN sebelum menambah indeks.
- UI hitung bisnis ulang: hanya presentasi metadata backend dan hint input.
- Recovery lokal: revert hanya patch F1; tidak menggeser data, tidak perlu pemulihan schema.
- Stop pada perluasan data/migration/role/secret/dependency, baseline konflik, capability/evidence
  tidak tersedia, atau kebutuhan keputusan produk baru. Tier 2 docs ADR/SSoT perlu Owner label
  jika nanti ada PR; agent tidak mengubah label tersebut (AI-020).
- F2–F4 tidak dimulai sebelum K2–K7 relevan diisi Owner di rencana induk.

## Persetujuan Owner — 2026-11-07

Owner menjawab `ok` atas permintaan persetujuan G0–G3: K1 tolak tanpa auto-shift;
L1 edit tanggal harus valid penuh, metadata tetap boleh; L2 tolak reopen di luar rentang.
ADR/SSoT dicatat dahulu, lalu Phase 1 lokal. Tidak mencakup commit/push/PR/merge/deploy.
Catatan Blocked/Belum sebelumnya adalah snapshot sebelum keputusan ini, bukan keputusan terbaru.

Path tambahan terkait AC yang ditemukan saat implementasi: taskController/featureSpecController dan apiClient untuk kode error range; FeatureStagePanels untuk badge pada daftar utama; unit apiClient/molekul, serta spec E2E F1. Semua masih boundary F1, tanpa perubahan izin/error non-F1.

## Hasil Phase 1 lokal

Kandidat dan bukti tersimpan, belum independent acceptance. Tambahan path yang melayani AC-F1.11:
`apps/web/src/lib/hooks/useFeatureScheduleRange.ts` dan tesnya (refresh context parent setelah 400),
`taskDetail/TaskDetailOverviewTab` dan tes kedua layout. Tidak ada perubahan dependency,
authorization/migrasi atau F2–F4. Review detail: [testing.md](testing.md).

## Window lanjutan G5 — 2026-11-07

Owner `ok kerjakan` setelah usulan menuntaskan F1 melalui review independen, perbaikan temuan,
validasi dan persiapan PR. Baseline tetap a717ba76 pada branch yang sama. WRA lokal tetap Ready
6/16; AC-to-evidence dan Change Impact Map di atas tetap berlaku. Tidak ada keputusan produk
baru. Pilihan rutin: reuse updateTask transaksional untuk folder/tanggal dan reuse helper metadata
pada assignment, alih-alih request terpisah atau salinan flag stale di React.

Scope tambahan langsung terkait AC: `apps/api/src/modules/tasks/internal/taskAssignment.ts`,
`apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx`, laporan G5 ini dan
status Feature/TODO. Urutan: review → fix → regresi → review ulang → docs → commit → push branch
non-protected → PR Tier 2 + auto-merge. Masa berlaku sampai PR siap/gate Owner atau stop condition.
Agent tidak memasang/mencopot label Owner; tidak melakukan mutasi data atau deploy manual Production.
Tidak ada perubahan skema/migrasi/authorization/dependency/secret. CI, Owner gate dan verifikasi
target menjadi evidence rilis terpisah, bukan bagian klaim Ready untuk kandidat lokal.
