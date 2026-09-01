## Task

QA-FORMAL-EVIDENCE-WORKFLOW

## Outcome

Production UAT membuktikan alur formal QA dari Draft sampai Result Evidence. QA mengajukan `UAT-EVID-001`, PO mengaktifkannya, QA mencatat Test Run `uat-prod-2026-08-31.1` dengan Result `Passed`, lalu Developer dan PO melihat dua evidence formal: Cloudinary image dan YouTube video. Semua record berada di Workspace terisolasi `Qlick Hub Production Validation` dan tidak ada data yang dihapus.

## Changed files

- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — aksi QA submit review dan PO activate Test Case.
- `apps/web/src/components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer.tsx` — tab QA Evidence read-only untuk Developer.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — cakupan lifecycle QA/PO.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/MyTaskDetailWorkspaceDrawer.test.tsx` — cakupan akses Developer QA Evidence.
- `docs/reports/UAT_ROLE_EVIDENCE_2026-08-29.md` — hasil retest production.
- `TODO.md` — status workflow diperbarui.

## Validation

- `npm --prefix apps/web run test -- QaTestingDesk.test.tsx MyTaskDetailWorkspaceDrawer.test.tsx` — 15/15 passed.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/web run build` — passed; warning bundle size sudah ada.
- Production browser UAT (2026-08-31) — passed untuk QA submit, PO activation, QA immutable Result dengan dua evidence link, dan read-only inspection oleh Developer serta PO.
- `GET https://qlickhub.vercel.app/v1/health` — 200; database connected (2026-08-31).

## Risks or follow-up

- UI membutuhkan beberapa detik untuk refresh record setelah mutasi. Record tetap tersimpan dan dibaca kembali dari production.

## TODO update

- QA-FORMAL-EVIDENCE-WORKFLOW → Done
