# TASK-READ-ACCESS — Tahap 3: Breakdown (Phase → Task BE · FE · QA)

**Status:** Disetujui
**Gerbang:** G3 — disetujui oleh Owner; persetujuan ini sekaligus Approval Window untuk phase pertama
**Disetujui:** Owner (Reyand), 2026-11-12 — pilihan "ADR + kebijakan dulu, PR 1 …, PR 2 …" pada chat
**PRD:** [product.md](product.md)
**Applicable Policy IDs:** AI-002, AI-009, AI-014, SDLC-001, AI-020

## Aturan pemecahan

Tiap phase satu PR Tier 2 yang dapat di-revert sendiri, dengan integration test PostgreSQL.

## 1. Peta phase

| Phase | Isi                                                                                                                           | AC               | Bergantung |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- |
| 1     | ADR-043, `AUTH-013`, fungsi bersama + middleware; tautan, Product Brief, dokumen task, aktivitas, acceptance checks, lampiran | AC-1 sampai AC-5 | —          |
| 2     | Requirement task, delivery trace, catatan rilis/sign-off, readiness, handoff                                                  | AC-6             | Phase 1    |

## 2. Task per phase

### Phase 1 — Fondasi dan route tasks/dokumen/lampiran

- BE: `taskAccess.ts`, `requireTaskReadAccess`, penerapan pada route; `getTaskImpl` memakai fungsi
  bersama.
- FE: tidak ada.
- QA/Evidence: `taskReadAccessIntegration.test.ts`; fixture `taskLinksIntegration.test.ts`
  disesuaikan; suite API penuh.

### Phase 2 — Route requirement, trace, rilis, readiness, handoff

- BE: `requireTaskReadAccess` pada GET requirements, delivery-trace, test-executions,
  qa-workflow-summary (`taskId`) dan release-records, readiness, readiness/findings, handoffs
  (`featureTaskId`); `getTaskTestExecutions` memakai `assertTaskAccessForActor`.
- FE: tidak ada.
- QA/Evidence: kasus Phase 2 pada `taskReadAccessIntegration.test.ts`; suite API penuh.

## 3. Risiko lintas phase

Halaman yang memuat data Feature tanpa memegang Subtask (belum ditemukan pada pencarian pemanggil
web: `TaskDetailDrawer`, `SubtaskWorkPage`, `QaSubtaskWorkSection`, `TestCaseRunPage`) akan menerima 403. Developer assignee Bug tanpa Subtask di Feature perlu diperiksa pada Phase 2.

## 4. Stop condition yang sudah terlihat

Tes yang ada gagal karena alur sah bergantung pada baca tanpa akses task; perlu perubahan kontrak
atau migrasi.
