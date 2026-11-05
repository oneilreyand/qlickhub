# ADR-041 — QA readiness per Requirement and a server-side QA flow

- **Status:** Accepted
- **Date:** 2026-11-05
- **Decision owner:** Owner, chat 2026-11-05: "buatkan plan fix nya aku ingin e2e flow sdlcnya
  berjalan dengan baik" and "aku ingin jalannya 1 round semua"; decisions K1 Workspace role,
  K2 "Per requirement", K3 "Lama ditandai digantikan", K4 "Ganti semua jadi REQ-001",
  K5 "Tidak ditampilkan" in the plan
  [Rencana Perbaikan Alur E2E SDLC](https://claude.ai/artifact/3rFeHzyrUqqc2Cq6nhP2NC).
- **Supersedes:** the Feature-wide, browser-only readiness rule of SIMPLE-UI-DELIVERY-FLOW P4c-6
  (AC-3.15) and the one-card-per-Feature QA queue of P4c-7 (AC-3.16).
- **Feature:** [E2E-SDLC-FLOW](../features/E2E-SDLC-FLOW/README.md)

## Context

An audit of Production (Feature "Fitur Pendaftaran Pasien") found that one Feature could not run
from the PO's idea to a Release Decision: the web app checked the global account role while the API
checks the Workspace role; Tugas Saya sent QA to pages it could not open; the "Developer ready"
gate lived only in the browser and failed open; a retest Result and its Retest Attempt were two
calls, so a failure between them locked the Bug; old Test Cycles stayed open; the Product Brief
could not be approved from the Feature page; QA could neither approve the Developer work it tested
nor complete its QA subtask from the QA work page; and the PO had no Release Decision control.

## Decision

1. **Workspace role (K1).** Every in-Workspace action in the web app follows the active Workspace
   membership role (`selectActiveWorkspaceRole`), the same role the API checks. The global account
   role only governs Workspace creation.
2. **QA readiness per Requirement (K2, `QA-010`).** A QA subtask may record Test Results when every
   Developer subtask (any non-QA, non-canceled subtask of the same Feature) that implements one of
   its Requirements is `in_review` or `done`. A QA subtask without Requirement links, or whose
   Requirements have no Developer subtask, falls back to every Developer subtask of the Feature.
   The rule lives in `developerReadiness.ts`; `createTestRun` refuses with `409` while it is not
   met, `GET /v1/workspaces/:workspaceId/tasks/:taskId/developer-readiness` exposes it, and the QA
   queue and pages only display it.
3. **QA queue.** QA sees one card per own QA subtask (assigned, open). It opens that subtask; the
   reason carries the readiness. Features without a QA subtask of the user are not shown (K5).
4. **Retest is one write.** Recording the Result of a contextual retest Run records its Retest
   Attempt (Bug `verified` or `reopened`) in the same transaction. The explicit Retest Attempt
   endpoint stays idempotent for the same Result.
5. **One open Test Cycle per QA subtask (K3).** Creating a Test Cycle marks older `planned` /
   `in_progress` cycles of the same QA subtask `superseded`. Their Results stay as history; new
   Results and retests land in the newest candidate.
6. **Bug routing.** A Bug goes to a Developer of the Requirement; if none is assigned yet, QA may
   choose any Workspace `dev` member. Only the QA assigned to the originating QA subtask may start a
   retest; the "ready for retest" notice goes to the Bug reporter and the Feature's assigned QA.
7. **Closing QA.** When the QA completion gate passes, the QA work page lets the assigned QA approve
   the Developer subtasks in review that it tested (`in_review → done`, an existing QA reviewer
   transition) and then complete its QA subtask; QA Sign-off follows.
8. **Release Decision.** The Feature page shows the release panel to Workspace `owner`, `admin`, and
   `po`; the queue card "Catat Keputusan Rilis" opens it.
9. **Short Requirement codes (K4).** Apply names Requirements `REQ-001`, `REQ-002`, … per Workspace
   under a transaction-scoped advisory lock. Migration `20261105000095` renames existing
   `REQ-<uuid>` codes and keeps the old codes in `requirement_code_renames`; immutable
   `requirement_findings.requirement_code` snapshots keep their original label.
10. **Bug notifications open the Bug (K6).** `notifications.bug_id` (FK inside the Workspace,
    cleared when the Bug is deleted) carries the Bug id that every Bug event already stores in the
    outbox payload; the bell and push open `/work/bugs/:id`. Migration `20261105000096` backfills
    older Bug notifications from the outbox.

## Consequences

- QA can test a Requirement whose Developer work is ready without waiting for unrelated work; the
  API, not the browser, enforces it.
- Completing the QA subtask still requires every Developer subtask of the Feature to be done (the
  existing completion rule); the QA page explains which work is left.
- The migrations are a Tier 2 data change and must be applied to Production before merge
  ([ADR-039](ADR-039-PRODUCTION-MIGRATION-GATE.md)). Rollback: `down` restores old codes from
  `requirement_code_renames`.
- Two additive migrations (`20261105000095`, `20261105000096`) ship in the same PR and are applied
  to Production in that order before merge.
