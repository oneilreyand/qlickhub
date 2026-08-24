# Completed Work Archive — Deletion Safety Audit

Completed items from the deletion and role-boundary audit started on 2026-08-24. Active work remains in [`TODO.md`](../../TODO.md).

## Attachment deletion safety

- [x] **Done** (Codex — 2026-08-24) — **ATT-8.1: Protect immutable evidence attachment deletion.** Formal `qa_evidence` and every attachment linked to an immutable Test Result now reject deletion for all roles. Ordinary attachments retain planner/original-uploader deletion, database authorization and evidence checks commit before external storage cleanup, and the API reports pending cleanup explicitly. Clean PostgreSQL migrations, targeted HTTP coverage, policy coverage, and the full 213-test API regression passed with zero skipped tests. Report: [`ATT_8_1_IMMUTABLE_EVIDENCE_DELETION_2026-08-24.md`](../reports/ATT_8_1_IMMUTABLE_EVIDENCE_DELETION_2026-08-24.md).

## Direct Subtask deletion

- [x] **Done** (Codex — 2026-08-24) — **TSK-8.2: Complete direct Subtask deletion experience.** Added a planner-only Delete Subtask action and shared confirmation inside the parent Feature accordion, Subtask-specific direct-link labels, immediate parent-list refresh, and persisted HTTP coverage proving Owner/Admin/PO success with Dev/QA rejection. Frontend regression passed 252/252 with zero skipped tests. Report: [`TSK_8_2_DIRECT_SUBTASK_DELETION_2026-08-24.md`](../reports/TSK_8_2_DIRECT_SUBTASK_DELETION_2026-08-24.md).

## Workspace member offboarding

- [x] **Done** (Codex — 2026-08-24) — **MEM-8.3: Make Workspace member offboarding role-safe and history-preserving.** Owner can remove every non-Owner role; Admin can remove PO/QA/Dev but not Owner/Admin. Active Task or unverified Bug assignments block removal. Successful offboarding atomically soft-deletes membership, revokes Task-creation permission, records the actor, preserves historical references, and prevents new assignments to inactive members. Full regressions passed 221/221 API tests and 255/255 frontend tests with zero skipped tests. Report: [`MEM_8_3_ROLE_SAFE_MEMBER_OFFBOARDING_2026-08-24.md`](../reports/MEM_8_3_ROLE_SAFE_MEMBER_OFFBOARDING_2026-08-24.md).

## Release-critical Task deletion

- [x] **Done** (Codex — 2026-08-24) — **TSK-8.4: Protect Task/Subtask deletion when release-critical records still exist.** Owner/Admin/PO remain the only deletion roles. Task-tree deletion now returns HTTP 409 while Requirement links, document links, attachments/evidence, Bugs, QA Sign-offs, or Release Decisions remain; PostgreSQL also prevents bypass deletion and new critical links to inactive Tasks. Shared Task/Subtask confirmations explain removable prerequisites and immutable blockers. Clean migrations through 56, 223/223 API tests, and 255/255 frontend tests passed with zero skipped tests. Report: [`TSK_8_4_RELEASE_CRITICAL_TASK_DELETION_GUARDS_2026-08-24.md`](../reports/TSK_8_4_RELEASE_CRITICAL_TASK_DELETION_GUARDS_2026-08-24.md).

## Developer specialization

- [x] **Done** (Codex — 2026-08-24) — **DEV-1.1: Persist Developer specialties and enforce delivery-area assignment integrity.** Workspace memberships now classify Developers as Frontend, Backend, Mobile, and/or Fullstack without changing the `dev` authorization role. New classifications persist through authenticated APIs, configured specialties gate Task assignment, active work protects required classifications, membership and mismatch overrides are audited, and all five delivery areas are visible across Workspace Settings, Task Hub, My Tasks, Task detail, seed data, and Report. Clean migrations through 57, 225/225 API tests, 257/257 frontend tests, and 51/51 contract tests passed with zero skipped tests. Report: [`DEV_1_1_DEVELOPER_SPECIALTIES_2026-08-24.md`](../reports/DEV_1_1_DEVELOPER_SPECIALTIES_2026-08-24.md).

## Workspace creation authorization

- [x] **Done** (Codex — 2026-08-24) — **AUTH-1.1: Restrict Workspace creation to Owner, Admin, and PO.** QA and Dev no longer receive Workspace-creation controls in onboarding, the empty-Workspace experience, or the header switcher. The authenticated route and direct service boundary share the same Owner/Admin/PO-only policy; PostgreSQL verification proves QA rejection without a persisted Workspace. Full regressions passed 226/226 API tests and 269/269 frontend tests with zero skipped tests. Report: [`AUTH_1_1_WORKSPACE_CREATION_AUTHORIZATION_2026-08-24.md`](../reports/AUTH_1_1_WORKSPACE_CREATION_AUTHORIZATION_2026-08-24.md).
