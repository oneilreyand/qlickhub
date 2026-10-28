# UI-WORKSPACE-REFRESH / P4 — Konteks Antrean dan Laporan

## Outcome

Tugas Saya sekarang membentuk URL kanonis dari item antrean backend: `taskId` atau `bugId` dan `nextAction`.
Refresh, back/forward, atau tautan yang dibagikan mempertahankan konteks item.
Panel QA hanya fokus ke Test Case atau Sign-off bila kode action memang memintanya.
Laporan tetap menampilkan data dari `capacityService` tanpa menghitung total browser dari daftar parsial.

## Assurance

- **Window:** Owner menyetujui P4 lewat pesan `setuju`, 2026-10-25; baseline `824daf0`.
- **WRA:** 8/16, Ready. UI/test/dokumentasi saja; API, kontrak, database, RBAC, migrasi, dan mutation tidak berubah.
- **Policies:** `UI-001`, `UI-002`, `UI-003`, `UI-004`, `AUTH-001`, `AUTH-002`, `CONTRACT-001`, `DATA-001`, `TEST-001`, `AI-002`, `AI-009`, `AI-010`, `SDLC-001`.

| AC     | Evidence achieved                                                                                                                                                                             | Outcome                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| AC-4.1 | Unit resolver covers all 16 `WorkQueueNextActionCode`; dashboard interaction regression test; authenticated QA, Owner, Developer, and PO browser runs                                         | E2 + cross-role E4; re-review pending after evidence refresh      |
| AC-5.1 | Report page state test plus capacity timeline data, empty, error/retry, and forbidden states; authenticated QA, Owner, Developer, and PO capacity readback; clean PostgreSQL integration test | E2 + E3 + cross-role E4; re-review pending after evidence refresh |

## Validation

- Focused web tests — 5 files, 49/49 passed across queue-route, dashboard, Report, capacity timeline, and API error adapter. Three pre-existing `act()` warnings occur only in the existing Bug drawer test; no test failed or was skipped.
- `apps/api` capacity integration — migrated a newly created PostgreSQL database `qlick_p4_capacity_e3_20261025a`, ran 10/10 capacity endpoint tests, then verified the disposable database was dropped. This proves persisted Task/Subtask data is read through authenticated capacity endpoints, including non-member `403` rejection.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/web run build` — passed.
- `npm run theme:check` and `npm run theme:test` — passed, 4/4.
- `npm run docs:check` — passed, 10/10.
- `npm run docs:completeness` — 91 baseline gaps, 0 new.
- `npm run lint` — 0 errors, 15 pre-existing warnings outside P4 paths.
- `git diff --check` — passed.
- `npm run validate` — passed: 25 DocSys tests passed, 4 browser-only DocSys tests skipped because Playwright Chromium is unavailable, and all remaining gates passed. The pre-existing 15 lint warnings are outside P4 paths; there are zero lint errors.
- DocSys timeout diagnosis — the original `portal did not start` symptom reproduced only inside the filesystem sandbox, where the child portal cannot bind `localhost`; outside the sandbox the portal tests start normally and skip only for unavailable Chromium. No DocSys test was weakened or changed.
- Authenticated browser QA, `/my-tasks` — clicking `execute_qa_task` navigated to `/my-tasks?taskId=18d005d7-cb20-4762-ab0e-819ff38cd7f2&nextAction=execute_qa_task`, opened the existing QA Test Case & Execution panel, and closing it returned to `/my-tasks`. No task, test case, result, or status was mutated.
- Authenticated browser QA, `/reports` — `TeamCapacityTimeline` loaded the backend capacity view for three members with scheduled and out-of-range counts, plus existing date, member, role, delivery-area, status, and scope filters. No partial browser aggregate or local example data was displayed.
- Authenticated browser Owner, `/my-tasks` — clicking `review_timeline` navigated to `/my-tasks?taskId=817e3fca-906b-4247-ab15-00b48b18f00b&nextAction=review_timeline`, opened the existing Ringkasan & Rilis feature context, and closing it returned to `/my-tasks`. No release decision, task, or status was mutated.
- Authenticated browser Owner, `/reports` — `TeamCapacityTimeline` loaded the persisted capacity view for three delivery members and preserved its backend-derived scheduled/out-of-range counts and filters. No mutation or browser-side capacity calculation occurred.
- Authenticated browser Developer (`mandorreyand@gmail.com`), `/my-tasks` — clicking `start_subtask` navigated to `/my-tasks?taskId=33a8a87d-c279-45ab-a8e4-1bd96736db4a&nextAction=start_subtask`, opened the existing Pengerjaan Dev subtask context, and closing it returned to `/my-tasks`. No task, handoff, or status was mutated.
- Authenticated browser Developer (`mandorreyand@gmail.com`), `/reports` — `TeamCapacityTimeline` loaded the persisted capacity view for three delivery members, including the assigned Developer's scheduled/out-of-range indicators, without local example data or a browser-side aggregate.
- Authenticated browser Product Owner (`po@assist.id`), `/my-tasks` — clicking `review_timeline` navigated to `/my-tasks?taskId=817e3fca-906b-4247-ab15-00b48b18f00b&nextAction=review_timeline`, opened the existing Ringkasan & Rilis feature context, and closing it returned to `/my-tasks`. The release-decision controls were not invoked; no task, decision, or status was mutated.
- Authenticated browser Product Owner (`po@assist.id`), `/reports` — `TeamCapacityTimeline` loaded the persisted capacity view for three delivery members, including backend-derived scheduled/out-of-range counts and filters. No local example data or browser-side capacity aggregate was used.
- Authenticated browser Product Owner (`po@assist.id`), `/my-tasks` — after opening `review_timeline`, a full browser refresh retained `/my-tasks?taskId=817e3fca-906b-4247-ab15-00b48b18f00b&nextAction=review_timeline` and restored the Ringkasan & Rilis panel. Browser Back returned to `/my-tasks` with no drawer; Forward restored the same URL and panel. No decision, task, or status was mutated.

## Quality review and follow-up

- Reuse: uses the existing My Tasks drawer, Bug panel, capacity interface, and React Router.
- Duplication: one typed route resolver centralizes all queue-code handling; no browser-side authorization, readiness, or capacity calculation added.
- Obsolete code: none found in the changed flow; uncontrolled Bug drawer behavior remains for existing consumers without a URL context.
- Browser QA, Owner, Developer, and Product Owner E4 are complete. No substitute role picker, fixture, or data mutation was used.
- The original independent verifier result was **Accepted with gaps**. The evidence refresh closed those gaps with a safe forbidden-state UI regression, a clean PostgreSQL E3 run, and a reproduced DocSys sandbox diagnosis.
- Independent re-review result: **Accepted**. It independently confirmed the 49/49 focused web suite, clean capacity endpoint evidence, database cleanup, full validation, and unchanged P4 scope. G5 is accepted for P4; the 15 lint warnings and three `act()` warnings remain non-blocking pre-existing warnings outside P4 paths.
