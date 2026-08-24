# AGY-0.3 Domain Policy Approval — 2026-08-23

## Task

AGY-0.3: Confirm unresolved domain policy.

## Outcome

The owner explicitly approved the repository's current implemented behavior as the binding product policy on 2026-08-23:

- Owner/Admin may grant an active, optionally expiring parent-Task creation permission to either Dev or QA members. The grant never permits subtask planning.
- Owner/Admin/PO manage Test Case definitions and Requirement mappings. QA may execute Test Runs and immutable Results but may not manage those definitions or mappings.
- Requirement is the canonical structural coverage target. Acceptance Criteria retain stable UUID/code identity and specification detail but do not require a direct Test Case mapping.
- Persisted, authenticated, Workspace-scoped `task_attachments` remain the permanent evidence direction and may be referenced by Test Result evidence.
- The current assigned Developer lifecycle, assigned QA execution, QA review, planning-field protection, assignment scoping, and independent release-decision rules are accepted.

ADR-001 is now `Accepted`, the source-of-truth plans describe the approved baseline, AGY-0.3 is archived as complete, and active `TODO.md` has no remaining items.

## Changed files

- `docs/adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md` — records owner acceptance and replaces proposals/pending language with the approved baseline.
- `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` — marks the implemented permission, coverage, and evidence policies as owner-approved.
- `DESIGN_IMPLEMENTATION_PLAN.md` — updates the frontend policy boundary from pending to approved.
- `docs/archive/TODO_COMPLETED_2026-08-23.md` — archives AGY-0.3 with its approved decisions and report link.
- `TODO.md` — removes the completed blocker and records that there are no active items.
- `docs/reports/AGY_0_3_DOMAIN_POLICY_APPROVAL_2026-08-23.md` — records this decision handoff.

## Data/interface impact

- None. The owner approved current behavior; no schema, API contract, route, or persisted record changed.

## Authorization impact

- No code change. Existing backend authorization is now the explicit product policy rather than a provisional implementation.
- UI visibility remains presentational and must not broaden server authorization.

## Migration risk

- None. No migration changed. Migration 48 remains immutable history and additive migration 49 remains the approved attachment recovery path.

## Validation

- Compared the accepted ADR permission matrix with the current Task, Test Management, attachment, Bug, release-decision, and Workspace policy/service code — matched the approved behavior.
- Local Markdown link existence check across active TODO, ADR, delivery/design plans, archive, and reports — passed.
- Search for stale `Awaiting Owner Approval`, `AGY-0.3 remains Blocked`, and equivalent pending-policy language in the source-of-truth documents — returned no stale matches.
- `git diff --check` for the decision documentation — passed.
- No application tests were rerun because this task accepts existing behavior and changes documentation only. The immediately preceding verified baseline remains contracts 49/49, API 207/207, frontend 249/249, 0 skipped, all typechecks/builds passed, and all 38 migrations plus the full release tracer passed on a disposable PostgreSQL database.

## Risks or follow-up

- Any future move to Acceptance-Criterion-level Test Case coverage requires a new approved task, additive Workspace-integral mapping, migration/contract changes, and PostgreSQL integration evidence.
- Any change to the approved attachment or delegation policy requires a new ADR amendment; it must not be inferred from UI needs alone.

## TODO update

- AGY-0.3: Confirm unresolved domain policy → `Done` and archived.
- Active TODO → no remaining items.
