# QA Assurance Workspace Rollout Controls

**Status:** Active — S7A backend verified locally; Production rollout pending
**Owner:** Product, Engineering, and QA
**Last reviewed:** 2026-09-15
**Applicable Policy IDs:** `AUTH-009`, `QA-009`, `RELEASE-003`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Setiap Workspace memiliki konfigurasi rollout QA assurance yang persisted: `observe`, `warn`, atau `enforce`. Default selalu `observe`; slice ini tidak mengaktifkan hard gate. Owner/Admin mengubah mode secara eksplisit dan menyertakan alasan audit. PO, Developer, dan QA dapat membaca konfigurasi Workspace mereka, tetapi tidak dapat mengubahnya.

## 2. Requirement dan Acceptance Criteria

- Workspace lama dan baru memiliki mode `observe` yang persisted.
- Hanya Owner/Admin aktif dapat mengubah mode dengan alasan minimal 10 karakter.
- Setiap perubahan mode membuat event append-only dari mode lama ke mode baru.
- Mode yang sama tidak membuat event baru.
- `warn` dan `enforce` belum mengubah lifecycle QA/Release pada S7A.

## 3. Alur Lintas Peran

Owner/Admin memilih perubahan rollout berdasarkan hasil pilot. PO, Developer, dan QA menggunakan mode sebagai informasi; mereka tidak memperoleh hak bypass atau hak mutasi baru. Keputusan pilot Workspace dan waktu penggunaan `warn`/`enforce` tetap keputusan rollout eksplisit di luar slice ini.

## 4. Data dan Relasi

`qa_assurance_rollout_settings` memiliki satu baris per Workspace. `qa_assurance_rollout_events` menyimpan perubahan mode, alasan, actor, dan waktu secara append-only. Penghapusan Workspace menghapus data rollout; penghapusan user pembuat perubahan dibatasi oleh FK audit.

## 5. API dan Shared Contract

- `GET /v1/workspaces/:workspaceId/qa-assurance-rollout`
- `PATCH /v1/workspaces/:workspaceId/qa-assurance-rollout`

Contract berada pada `packages/contracts/src/workspace.ts`. PATCH menerima `mode` dan `reason`.

## 6. Authorization

Backend memeriksa active Workspace membership untuk read dan Owner/Admin untuk mutation. Route guard tidak menggantikan policy/service enforcement.

## 7. UI dan Interaction States

S7A adalah backend persistence/API slice. UI rollout beserta loading, error, disabled, dan permission-denied state berada pada slice S7B yang masih memerlukan validasi visual terautentikasi.

## 8. Pengujian dan Evidence

Contract regression membuktikan mode dan alasan audit tervalidasi. PostgreSQL integration pada database uji disposable lulus 4/4 untuk default/backfill, Workspace isolation, Owner/Admin allow, PO/Developer/QA deny, reason validation, audit append-only, dan transaction rollback. Clean migration verifier serta release lifecycle verifier lulus dengan migration 81 dan regression S7A. Hasil lokal ini tidak membuktikan rollout Production.

## 9. Release dan Readiness

Migration additive 81 membuat default aman `observe`; aplikasi lama tetap dapat membaca schema baru. Tidak ada Production/Preview migration atau hard gate pada slice ini.

## 10. Traceability

QA assurance decision record → S7 rollout requirement → Workspace setting/event → shared contract/API → PostgreSQL integration → pilot decision → `warn`/`enforce` rollout evidence.
