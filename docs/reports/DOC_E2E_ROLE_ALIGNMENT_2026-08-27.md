## Task

DOC-E2E-ROLE-ALIGNMENT: reconcile the role-based E2E guide with the accepted QA Test Case workflow.

## Outcome

The guide now states that QA authors and edits Test Cases only while they are `draft`, may create
their Requirement mappings, and submits them for planner review. Owner, Admin, or PO publishes
the Test Case to `active` or archives it. New Test Runs require `active` Test Cases.

## Changed files

- `docs/plans/ROLE_BASED_E2E_WORKFLOW.md` — updated the role matrix, product/QA handoffs,
  rejection path, and completion evidence.

## Validation

- Compared the guide against `docs/adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md` section
  “2026-08-24 Addendum: Test Case intake, evidence, and communication defaults”.
- Compared the guide against `apps/api/src/policies/testManagementPolicy.ts`.
- `git diff --check` — passed.

## Risks or follow-up

- The separate QA-native Work Hub delivery plan retains an older baseline wording in places. ADR-001
  and the backend policy are the authority for the Test Case lifecycle.

## TODO update

- `DOC-E2E-ROLE-ALIGNMENT` → `Done`
