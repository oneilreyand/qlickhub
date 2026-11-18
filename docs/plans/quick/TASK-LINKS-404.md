# QUICK — TASK-LINKS-404 Task/tautan yang tidak ada dijawab 404, bukan 500

**Status:** Selesai
**WRA:** 2/16 — lapisan 1 (API tasks), validasi 1 (test integration baru)

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: `GET /v1/workspaces/:workspaceId/tasks/<id tidak ada>/links` menjawab 500 (dicatat di
  closeout 2026-11-12). Id yang tidak berbentuk UUID juga menjadi error database 500.
- Penyebab: `TaskNotFoundError`/`TaskLinkNotFoundError` membawa `status = 404`, tetapi
  `sendProblemDetails` hanya mengenali prefix pesan `NOT_FOUND:`; id non-UUID diteruskan ke PostgreSQL.

## Perubahan

- File/path: `apps/api/src/modules/tasks/taskLinkService.ts`, `taskLinkController.ts`,
  `__tests__/taskLinksIntegration.test.ts`; `TODO.md` (status WORK-VISIBILITY diperbarui); Quick Card ini.
- Bukan scope: mengubah format Problem Details untuk modul lain.

## Acceptance Criteria → bukti

| AC                                            | Bukti yang dibutuhkan (E-level) | Perintah / observasi           |
| --------------------------------------------- | ------------------------------- | ------------------------------ |
| AC-1 Task yang tidak ada → 404 `NOT_FOUND`    | E3                              | `taskLinksIntegration.test.ts` |
| AC-2 Id task/tautan non-UUID → 404, bukan 500 | E3                              | `taskLinksIntegration.test.ts` |
| AC-3 Perilaku tautan yang ada tidak berubah   | E3                              | 7 test lama tetap lulus        |

## Approval Window

- Task / baseline: TASK-LINKS-404 @ `origin/main` `e710d525` (PR #143)
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner push → PR → merge (Tier 1)
- Masa berlaku dan stop condition: sampai PR dibuat

**Disetujui:** reyand (Owner), 2026-11-18, chat "ok kerjakan untuk nomor 3 kita skip"

## Hasil

- Perintah — exit code — pass/fail/skip: `node --test …/taskLinksIntegration.test.js` — 0 — 8/0/0; suite API penuh — 0 — 747/0/0.
- PR dan tier: Tier 1, tanpa migrasi.
- Gap: tidak ada.
