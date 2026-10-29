# ADR-036: Feature Spec, Server-Enforced Required Fields, and Agent-Ready Writes

**Status:** Accepted — effective when merged
**Date:** 2026-10-29
**Decision owner:** Product (Owner) — user approval in Claude chat, 2026-10-29
**Implementation stakeholders:** Backend, Frontend, AI integration, QA, and AI agents (MCP, later)
**Feature:** [SIMPLE-UI-DELIVERY-FLOW](../features/SIMPLE-UI-DELIVERY-FLOW/README.md)
**Policy IDs:** DOC-002, DOC-005, SDLC-001, AUTH-001, CONTRACT-001, DATA-001, AI-009, AI-013

## Context

Stage 5 of SIMPLE-UI-DELIVERY-FLOW planned a separate Plan record (`feature_plans`), then AI
questions, then a versioned draft, then Apply. Phase P5a-1 implemented only the first record (title
and idea). On review the Owner cancelled it: a Plan that is separate from the PRD and Tasks, and that
allows any field to stay empty, does not serve the intended product direction.

The Owner's direction (chat, 2026-10-29): (1) a simpler UI; (2) AI performs the Plan → PRD → Task
flow; (3) every field must be filled; (4) later, agents connect through MCP and read and update the
Plan, PRD, and Tasks directly.

Existing building blocks: a Gemini-based generator with `GeneratedTaskDraftSchema` (task, Product
Brief, Requirements with Acceptance Criteria, subtasks, citations), an Apply path
(`ApplyTaskDraftInputSchema`, at least one subtask), a four-stage Feature page (ADR-035), and
`task_activity` as the audit log. Today description, `outScope`, schedule, and assignee may be
empty, and subtasks are assigned only by the creator.

## Decision

1. **Feature Spec.** Each root Feature has one versioned Feature Spec stored on the server with three
   sections: Plan, PRD, and Task. A human, the AI, or an agent may write a section. **Apply** turns
   the Spec of a stated version into the Product Brief, Requirements, Acceptance Criteria, subtasks,
   and links in one transaction. Apply is idempotent per Spec version and creates nothing on partial
   failure.
2. **Required fields, enforced by the server.** A section cannot be saved as complete, a stage cannot
   advance, and Apply cannot run while a required field is empty. The server answers 400 with a
   machine-readable `missingFields` list. The rule is identical for the UI, the AI, and agents.
   - **Plan:** title, problem or background, target users, goal, success measure, in-scope, out-of-scope,
     target platform, priority, start date, and due date.
   - **PRD:** Product Brief context, in-scope, and out-of-scope; each Requirement has a title, a
     description, and at least one Given/When/Then Acceptance Criterion.
   - **Task:** each subtask has a title, description, delivery area, priority, schedule, at least one
     linked Requirement, and an **assignment mode**; every Requirement has an implementing subtask.
3. **Two assignment modes.** `assigned`: the product team names the assignee (the assignee is
   required). `open`: the assignee stays empty until a person with a matching role claims the subtask
   with one atomic action; a second concurrent claim receives 409. Owner, Admin, and PO can release or
   reassign. The "available to claim" queue is a new bucket in Tugas Saya (phase P5g).
4. **Agent-ready writes, MCP later.** Every write records an actor (type `user` or `agent`, id, and
   channel), carries an optimistic version (409 on a stale version), writes `task_activity`, and Apply
   takes an idempotency key. The UI and any future MCP server call the same service operations. The
   MCP server and agent authentication are not part of this decision; they need their own ADR (P9).
5. **AI.** The existing generator and schemas are reused. Server-side validation re-checks AI output
   with the same required-field rules; AI output is never trusted. Tests use a fake AI client.
6. **UI.** The Feature page shows three screens (Plan, PRD, Task), each with a live "required fields"
   checklist and one primary action. The Task Hub entry is one step: "write the idea". Existing tabs
   (Detail Task, Brief, Requirement, Subtasks, Diskusi) remain reachable after Apply.
7. **Cancelled work.** P5a-1 and the `feature_plans` table are cancelled. Migration 92 is not merged.
8. **Stage is derived.** `tasks.stage` is not added; the stage is computed from the Spec status and the
   task status.

## SSoT changes on acceptance (DOC-002)

| Document                                                                 | Change                                                                                                                                                            |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [product.md](../features/SIMPLE-UI-DELIVERY-FLOW/product.md)             | REQ-5 rewritten: AC-5.1 to AC-5.10 for Feature Spec, required fields, versions and actors, AI stages, Apply, authorization, UI, stage column, and open assignment |
| [contracts.md](../features/SIMPLE-UI-DELIVERY-FLOW/contracts.md)         | Stage 5 rows replaced: `feature_specs`, `feature_spec_versions`, `feature_spec_questions`, `tasks.assignment_mode`, Feature Spec endpoints, claim endpoint        |
| [authorization.md](../features/SIMPLE-UI-DELIVERY-FLOW/authorization.md) | Spec write and Apply rows; claim, release, and reassign rows                                                                                                      |
| [breakdown.md](../features/SIMPLE-UI-DELIVERY-FLOW/breakdown.md)         | Phase map P5-0, P5a to P5g, P9; P5a-1 marked cancelled                                                                                                            |
| [POLICY_REGISTRY.md](../POLICY_REGISTRY.md)                              | No new policy ID                                                                                                                                                  |

## Consequences

- The shape of data, contracts, and rules is fixed before any code, because the UI, the AI, and the
  agents share it.
- Required fields make AI output stricter; a failed generation shows which field is missing instead of
  saving incomplete data.
- Subtasks may exist without an assignee in `open` mode, so queue and report code must treat an
  empty assignee as "available" rather than "unassigned by mistake" for those subtasks.
- Existing Features without a Spec keep working; a Spec is created only for Features that start from
  an idea.
- No code, migration, or API change is made by this ADR; each phase has its own Approval Window.

## Alternatives considered

- **Keep a separate Plan record (P5a-1)** — rejected: it duplicates the idea, splits the data the AI
  must fill together, and does not enforce required fields.
- **Required fields only in the UI** — rejected: an MCP agent could save incomplete data, so the rule
  would leak.
- **Required fields only at Apply** — rejected by the Owner: "all required" would be felt only at the
  end.
- **Build the MCP server together with Stage 5** — rejected for scope and risk; the foundation (actor,
  versions, idempotency) is built now and the server later.
- **Assignee always required at draft time** — rejected: the AI can propose an area and a role, not a
  person, and teams also want self-claimed work.
