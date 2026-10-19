# QUICK — QA-IN-REVIEW-ACTIVATION QA tidak ditawari aktivasi Test Case yang menunggu review PO

**Status:** Menunggu persetujuan
**WRA:** 2/16 — lapisan 1 (frontend saja), ketersinggungan 1 (detail Test Case meja QA), validasi 1

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: QA yang ditugaskan melihat tombol **Aktifkan Test Case** pada Test Case berstatus `in_review`
  ("Menunggu Review PO"). Server menolak dengan 403 karena hanya Product Owner, Admin, atau Owner yang
  boleh memindahkan `in_review` → `active`.
- Bukti: [report smoke test lokal](../../reports/LOCAL_SMOKE_TEST_2026-10-19.md) — `PATCH /test-cases/:id`
  `{status: active}` sebagai QA → 403; `apps/api/src/policies/testManagementPolicy.ts`
  `assertCanUpdateTestCase` (QA hanya `draft` → `active`);
  `apps/web/src/components/ui/organisms/myTasks/qaDesk/tabs/QaTestCaseDetailView.tsx` menampilkan tombol
  untuk `['draft', 'in_review']` bagi siapa pun dengan `canActivateTestCases`.

## Perubahan

- File/path: `QaTestCaseDetailView.tsx`, `QaTestingDesk.tsx` (meneruskan `isPlanner`), test di
  `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx`, Quick Card ini.
- Perilaku: tombol aktivasi untuk `in_review` hanya tampil bagi Product Owner, Admin, atau Owner. QA tetap
  bisa mengaktifkan `draft`; untuk `in_review` QA melihat teks "Menunggu review PO".
- Bukan scope: kebijakan backend, alur review PO, Test Case `draft` di luar scope QA.

## Acceptance Criteria → bukti

| AC                                                                  | Bukti (E-level) | Perintah / observasi       |
| ------------------------------------------------------------------- | --------------- | -------------------------- |
| AC-1 QA tidak melihat tombol aktivasi untuk Test Case `in_review`   | E1              | `QaTestingDesk.test.tsx`   |
| AC-2 QA tetap bisa mengaktifkan Test Case `draft`                   | E1              | test yang ada tetap lulus  |
| AC-3 PO/Admin/Owner tetap melihat tombol aktivasi untuk `in_review` | E1              | `QaTestingDesk.test.tsx`   |
| AC-4 Tidak ada regresi web                                          | E2              | suite web, typecheck, lint |

## Approval Window

- Task / baseline: QA-IN-REVIEW-ACTIVATION @ `2894a62`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → merge (Tier 1)
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila perlu perubahan backend atau suite web gagal

**Disetujui:** —

## Hasil

- Perintah — exit code — pass/fail/skip: —
- PR dan tier: —
- Gap: —
