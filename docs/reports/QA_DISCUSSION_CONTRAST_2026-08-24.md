## Task

QA-DISCUSSION-CONTRAST

## Outcome

Plain text in a discussion message now inherits the sender bubble's text color. A QA message in the lime sender bubble therefore uses the product charcoal `#141413`, instead of the renderer's forced light text in dark mode.

The original build and database blockers were re-audited on 2026-09-14 and are resolved. Both the
active Development and Production databases report additive migration
`20260824000061-add-evidence-links-unique-indexes.cjs` as `up`, and the complete frontend now
type-checks, tests, and builds successfully. No migration or persisted-data mutation was performed
during this revalidation.

The approved charcoal `#141413` against brand lime `#B1E743` has a WCAG contrast ratio of 12.62:1.

## Changed files

- `apps/web/src/components/ui/molecules/DiscussionMediaRenderer.tsx` — removes the hard-coded dark-mode text color so message content inherits its bubble contrast.
- `apps/web/src/components/ui/molecules/__tests__/DiscussionMediaRenderer.test.tsx` — regression coverage for sender-bubble text inheritance.
- `TODO.md` — records final validation and closure of the stale blockers.
- `docs/reports/QA_DISCUSSION_CONTRAST_2026-08-24.md` — retains the original evidence and records
  the 2026-09-14 closure audit.

## Validation

- `npm --prefix apps/web test -- DiscussionMediaRenderer.test.tsx` — passed, 1 file and 12 tests.
- `npm --prefix apps/web run test -- src/components/ui/molecules/__tests__/DiscussionMediaRenderer.test.tsx src/components/ui/molecules/__tests__/TaskCommentBox.test.tsx` — passed 2/2 files and 24/24 tests, with 0 failed and 0 skipped.
- `npm --prefix apps/web run test` — passed 85/85 files and 445/445 tests, with 0 failed and 0 skipped. Existing non-failing React `act(...)` warnings remained in unrelated Workspace settings, QA desk, timeline, notification, and Header tests.
- `npm --prefix apps/web run build` — passed TypeScript compilation and Vite Production build; 1,708 modules transformed. The original `TaskDetailDrawer.tsx` type errors no longer exist.
- `NODE_ENV=test node --test dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js` — passed 1/1 PostgreSQL integration suite and 7/7 tests against the disposable test database, including persisted Test Execution reads and cross-Workspace authorization boundaries.
- Development `sequelize-cli db:migrate:status --env development` audit — migration 61 and every later canonical migration through 69 reported `up`. The initial sandboxed connection failed without changing the database; the approved read-only retry succeeded.
- Production migration audit recorded during `PRODUCTION-RELEASE-ROUTED-PAGE-RECOVERY` — all 53 canonical Production migrations, including migration 61, reported `up`.
- WCAG relative-luminance calculation for `#141413` text on `#B1E743` background — 12.62:1, exceeding AAA requirements for normal text.
- `npm run validate` — passed documentation checks 5/5 and contracts/API/web typechecks; lint reported 0 errors and 22 pre-existing warnings.
- `git diff --check` — passed before closure and will be repeated after this report update.

## Risks or follow-up

- No remaining blocker. The change is presentation-only; API contracts, authorization, persisted
  data, schemas, and migrations are unchanged by this task.
- The integration suite proves the Test Execution interface against PostgreSQL without creating
  or modifying Development or Production business records.

## TODO update

- QA-DISCUSSION-CONTRAST → Done
