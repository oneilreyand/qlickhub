## Task

QA-IMPORT-EVIDENCE-PLAN: Define the production plan for native/manual spreadsheet Test Case intake, Test Result evidence links with in-app preview, and QA–Dev–PO communication.

## Outcome

Published a production implementation plan for two intake paths that converge on canonical Test Case records: native authoring and controlled CSV/XLSX spreadsheet import. The plan distinguishes reusable Test Cases from immutable Test Results, places formal evidence on the Result, exposes inherited evidence on Bugs, and specifies separate Bug-specific evidence only when needed.

It also defines the QA–Developer–PO communication contract, server-side notification ownership, import audit/idempotency, external-link preview safety, authorization matrix, delivery slices, and required PostgreSQL/frontend validation.

## Changed files

- `docs/plans/TEST_CASE_INTAKE_EVIDENCE_COMMUNICATION_PLAN.md` — production plan, policy decisions, data model, user flow, communication contract, delivery slices, and validation requirements.
- `TODO.md` — records the completed planning task and its remaining product-policy decisions.

## Validation

- `npx prettier --check TODO.md docs/plans/TEST_CASE_INTAKE_EVIDENCE_COMMUNICATION_PLAN.md` — passed.
- `git diff --check -- TODO.md docs/plans/TEST_CASE_INTAKE_EVIDENCE_COMMUNICATION_PLAN.md` — passed.

## Risks or follow-up

- Do not implement before approving D1–D6 in the plan: QA Test Case authority/publishing lifecycle, import scope, duplicate mode, PO notification threshold, and external-preview provider allowlist.
- Existing source sheet Requirement codes must be mapped to canonical Requirement UUIDs through preview validation; unknown codes cannot be inferred.
- The repository contains pre-existing unrelated changes; this task did not modify them.

## TODO update

- QA-IMPORT-EVIDENCE-PLAN → Done
