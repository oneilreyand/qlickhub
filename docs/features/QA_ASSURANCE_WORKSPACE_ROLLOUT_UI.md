# QA Assurance Workspace Rollout UI

**Status:** Active — S7B implementation in progress
**Owner:** Product, Engineering, and QA
**Last reviewed:** 2026-09-15
**Applicable Policy IDs:** `AUTH-009`, `QA-009`, `RELEASE-003`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Workspace Settings menampilkan mode rollout QA assurance yang benar-benar dikembalikan backend. Owner/Admin dapat mencatat perubahan mode dengan alasan audit; PO, Developer, dan QA membaca mode tersebut secara jelas tanpa memperoleh izin mutasi. Slice ini tidak mengaktifkan hard gate atau menghitung readiness di browser.

## 2. Requirement dan Acceptance Criteria

- Card memuat `observe`, `warn`, atau `enforce` dari endpoint authenticated, tanpa fallback data lokal.
- Owner/Admin aktif dapat memilih mode berbeda dan hanya dapat menyimpan setelah alasan minimal 10 karakter tersedia.
- PO/Developer/QA melihat mode aktif, dampak mode, dan kontrol disabled tanpa textarea atau tombol simpan.
- `enforce` menjelaskan bahwa hard gate belum aktif pada S7B.
- Loading, missing, error/retry, disabled, dan permission-denied state tersedia.

## 3. Alur Lintas Peran

Owner/Admin mengevaluasi hasil pilot lalu mencatat alasan perubahan mode. Semua peran membaca konfigurasi yang sama untuk memahami bagaimana evidence QA diperlakukan. Backend tetap sumber otoritas: penolakan server ditampilkan sebagai error dan tidak dapat dibypass oleh UI.

## 4. Data dan Relasi

Tidak ada data browser-only. Card membaca `qa_assurance_rollout_settings` melalui API S7A dan mutation menulis setting/event audit melalui backend yang sama. S7B tidak membuat schema atau migration baru.

## 5. API dan Shared Contract

- `GET /v1/workspaces/:workspaceId/qa-assurance-rollout`
- `PATCH /v1/workspaces/:workspaceId/qa-assurance-rollout`

Client menggunakan `QaAssuranceRolloutSettings` dan `UpdateQaAssuranceRolloutSettingsInput` dari `packages/contracts/src/workspace.ts` melalui `workspaceService`.

## 6. Authorization

UI menampilkan kontrol mutasi hanya ketika peran Workspace yang tersimpan adalah Owner/Admin dan Workspace tidak diarsipkan. Semua active member dapat mencoba read sesuai kontrak backend. Backend policy/service tetap enforcement final untuk `AUTH-009`; visibilitas UI bukan authorization.

## 7. UI dan Interaction States

Route `/workspaces/settings` mengomposisikan organism `QaAssuranceRolloutCard` dari atom Card, Select, Textarea, Button, Alert, dan LoadingSpinner. Card memakai token Stitch yang tersedia, label eksplisit, focus native, dan target Button minimum 44px. Tata letak mengikuti kolom pengaturan Workspace dan melipat secara natural pada mobile.

- Loading: spinner dan teks aksesibel.
- Missing/error: Alert tanpa nilai buatan serta aksi retry.
- Read-only/archived: select disabled dan penjelasan izin; tidak ada form mutasi untuk PO/Developer/QA.
- Owner/Admin: reason dan save disabled sampai mode berbeda serta alasan valid.

## 8. Pengujian dan Evidence

Test component membuktikan validasi alasan, read-only, dan retry. Test API client membuktikan endpoint/method/body. Test page membuktikan fetch dan mutation Owner serta Developer read-only. PostgreSQL evidence untuk setting/event masih berada pada S7A dan belum tersedia selama environment database diblokir.

## 9. Release dan Readiness

S7B aman untuk tampil karena hanya mempresentasikan status backend. Jangan deploy migration 81 atau mengaktifkan `warn`/`enforce` sebagai lifecycle gate sebelum migration rehearsal, PostgreSQL integration, pilot lintas peran, dan keputusan rollout eksplisit selesai.

## 10. Traceability

QA assurance decision → Workspace rollout setting/event → shared contract/API → `QaAssuranceRolloutCard` → frontend interaction tests → PostgreSQL integration S7A → pilot evidence → keputusan rollout.
