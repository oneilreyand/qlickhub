## Task

QA-REVIEW-REMEDIATION-4: make Test Case intake and formal evidence remediation production-safe without changing unapproved product policy.

## Outcome

Migration 61 no longer deletes duplicate formal evidence. It preserves every historical duplicate in its original table, marks it with `deduplicated_at` and its canonical evidence-link ID, and applies a partial unique index only to canonical rows. API reads exclude archived duplicates while the database retains recovery/audit data.

Test Result attachment evidence now fails closed unless the Test Case maps through an active Requirement to a Feature Task/subtask scope. Import sessions now persist `failed` before an expired commit request is rejected, and all-invalid imports return a consistent failed status. The import wizard no longer advertises invalid enums; its affected selects and picker rows meet the 44px target, and its error dismissal uses the shared IconButton.

D1–D6 were approved with the documented defaults. QA may author/import Test Cases as drafts and submit them for review; Owner/Admin/PO publish or archive. Import `update` remains planner-only. Direct media preview now requires an explicitly configured HTTPS host allowlist; other HTTPS links are retained as click-to-open evidence.

## Changed files

- `apps/api/src/db/migrations/20260824000061-add-evidence-links-unique-indexes.cjs` — preserves duplicate evidence rows and adds canonical partial unique indexes.
- `apps/api/src/db/models/testResultEvidenceLink.ts` and `apps/api/src/db/models/bugEvidenceLink.ts` — model archived duplicate metadata and partial index shape.
- `apps/api/src/modules/testManagement/testManagementService.ts` and `apps/api/src/modules/bugs/bugService.ts` — hide archived duplicates from canonical reads and enforce attachment provenance.
- `apps/api/src/modules/testManagement/testCaseImportService.ts` — commits import-session failure status correctly.
- `apps/api/src/policies/testManagementPolicy.ts` and `apps/api/src/modules/testManagement/testManagementService.ts` — enforce QA draft-only authoring/review and planner publishing.
- `apps/api/src/modules/testManagement/evidenceNormalizer.ts` and `.env.example` — enforce configured direct-media preview hosts.
- `apps/api/src/db/__tests__/migration61EvidenceDeduplication.test.ts` and `apps/api/src/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.ts` — prove non-destructive migration, fail-closed provenance, and expired-session persistence.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` and `apps/web/src/components/ui/organisms/myTasks/TestCaseImportWizardModal.tsx` — correct supported values and accessible target sizes/labels.

## Validation

- `git diff --check` — passed.
- `npm run validate` — passed; 0 errors and 27 pre-existing warnings.
- `npm --prefix apps/api run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/db/__tests__/migration61EvidenceDeduplication.test.js apps/api/dist/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.js` — passed: 27/27 tests, using the local PostgreSQL test database.
- `NODE_ENV=test node --test apps/api/dist/modules/testManagement/__tests__/evidenceNormalizer.test.js apps/api/dist/policies/__tests__/testManagementPolicy.test.js apps/api/dist/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.js` — passed: 37/37 tests, including lifecycle transition rejection, QA draft → review → PO publish, QA create-only draft import, and direct-media allowlist enforcement.
- `npm --prefix apps/api run db:verify:clean-migrations` — passed: all 61 canonical migrations on disposable database `qa_management_phase0_verify_51541`.
- `npm --prefix apps/web test` — passed: 270/270 tests across 59 files; two existing React `act(...)` warnings from `MyTaskDetailWorkspaceDrawer`/`QaTestingDesk` test setup.
- `npm --prefix apps/web run build` — passed; existing Vite >500 kB chunk advisory remains.

## Risks or follow-up

- Configure `EVIDENCE_DIRECT_MEDIA_HOST_ALLOWLIST` in each deployment before expecting direct image/video preview. Unlisted HTTPS URLs remain auditable click-to-open links.
- Migration 61 is confirmed not to have run outside development. If that changes, do not edit the migration again; investigate backup/incident recovery before deployment.

## TODO update

- `QA-REVIEW-REMEDIATION-4` → `Done`.
