## Task

Reset seluruh data aplikasi Qlick Hub Production dan siapkan satu Workspace baru untuk pengujian E2E.

## Outcome

Dua Workspace Production lama beserta folder evidence Google Drive masing-masing telah dihapus,
kemudian seluruh tabel aplikasi ditruncate tanpa mengubah schema atau riwayat migration.
Workspace baru bernama `qlickhub` dibuat dengan empat akun aktif: satu Owner, satu PO, satu
Developer fullstack, dan satu QA. Tidak ada Task, Requirement, Test Case, hasil QA, attachment,
atau data contoh yang dibuat.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow](../2_WORKFLOW_AND_ROLES.md), dan [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `DATA-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Semua row aplikasi lama dihapus; `SequelizeMeta` dan schema Production dipertahankan. Satu Workspace dan empat membership baru dipersistenkan.
- **Authorization impact:** Membership baru adalah Owner, PO, Developer dengan specialty `fullstack`, dan QA pada Workspace `qlickhub`.
- **Migration risk:** Tidak ada migration dijalankan atau dihapus.

## Changed files

- `apps/api/src/config/env.ts` — menormalisasi whitespace pada ID folder Google Drive agar operasi storage Production memakai identifier yang valid.
- `docs/reports/PRODUCTION_DATA_RESET_2026-09-23.md` — mencatat scope reset dan bukti verifikasi tanpa nilai credential.

## Validation

- Production reset maintenance — passed; dua Workspace lama dan folder storage terkait dihapus sebelum truncation, lalu satu Workspace baru dan empat membership dibuat.
- Authenticated Production readback — Owner login passed (`200`); daftar Workspace menghasilkan tepat satu Workspace bernama `qlickhub` (`200`).
- Production login — PO, Developer, dan QA masing-masing passed (`200`) melalui origin Production yang sah.
- `npm --prefix apps/api run typecheck` — passed, exit 0.
- `npm --prefix apps/api run build` — passed, exit 0.

## Risks or follow-up

- Reset ini menghapus data sebelumnya secara permanen; tidak ada data contoh dibuat agar pengujian E2E dapat dimulai dari state kosong.
- Endpoint maintenance dan secret sekali pakai dicabut setelah verifikasi; deploy bersih diperlukan untuk menghapus endpoint dari runtime Production.

## TODO update

- Production data reset for E2E → Done
