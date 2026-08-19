# Agent Workflow — Qlick Hub (Task Management & Collaboration Hub)

This file is the mandatory operating guide for every agent working in this repository. Qlick Hub is a unified Task Management & Collaboration platform connecting Product Owners, Developers (Frontend & Backend), and QA for end-to-end task orchestration and delivery.

## Source of truth

Read these documents before making changes:

1. `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` — product, architecture, security, and delivery plan.
2. `DESIGN_IMPLEMENTATION_PLAN.md` — Work Hub UI system and frontend implementation slices.
3. `TODO.md` — current prioritized work.
4. `AGENT_REPORT_TEMPLATE.md` — required handoff/report format.

When documents conflict, use this priority: explicit user instruction → security constraints → Work Hub delivery plan → design plan → TODO.

## Core rules

- For all frontend work, follow `docs/AGENT_UI_COMPONENT_POLICY.md`. Reuse the Atomic Design system before adding markup or styles to a page.

- Work on exactly one TODO item or one tightly related subtask at a time.
- Before editing, inspect the relevant code and identify the files likely to change.
- Do not overwrite unrelated user changes, move existing code, or introduce a new framework without an explicit task.
- Keep the frontend as React + Vite + React Router + Redux Toolkit/Redux Thunk.
- Keep the backend as Express + TypeScript + Sequelize + PostgreSQL.
- Treat PostgreSQL through Sequelize as the default. Use parameterized raw SQL only for `pgvector`, indexes, analytics, or PostgreSQL-specific needs.
- Enforce authorization in backend policy/services. UI visibility is not authorization.
- Never expose `DATABASE_URL`, JWT secrets, Google Drive service-account credentials, or AI keys to the browser.
- Keep the Stitch design contract intact: Inter, indigo `#6366F1`, emerald `#10B981`, amber `#F59E0B`, neutral `#64748B`, sidebar navy `#0B1C30`, 16px cards, and accessible dark mode.

## Task lifecycle

1. **Claim** — Change the selected item in `TODO.md` to `In progress`, with agent name/date if known.
2. **Understand** — Read applicable delivery-plan/design sections and inspect current implementation.
3. **Plan briefly** — State files, data/API impact, risks, and validation approach.
4. **Implement atomically** — Deliver the smallest useful vertical slice. Reuse existing atoms, molecules, modules, and contracts.
5. **Verify** — Run the narrowest relevant tests, then `npm run build` when frontend code changes. Record what was actually run.
6. **Review** — Check empty/loading/error/permission states when the feature is data-driven.
7. **Report** — Use `AGENT_REPORT_TEMPLATE.md`.
8. **Update TODO** — Mark complete only when verified; otherwise leave an explicit blocker or next action.

## Definition of done

A TODO item is done only when all applicable items are true:

- Behaviour matches the stated acceptance criteria.
- API inputs are validated and authorization is enforced for mutations.
- UI uses shared design tokens/components and works at desktop and mobile sizes.
- Loading, empty, error, and disabled states exist where relevant.
- Tests/build checks were run and their result is recorded.
- Activity/audit event is created for a user-visible mutation when required by the delivery plan.
- Documentation and TODO status are updated.

## Working boundaries

- Do not mark a task complete because code was written but not verified.
- Do not silently use fake data in a production path. Mock fixtures must live in the contracts/test area and be labelled.
- Do not make direct database calls from frontend features.
- Do not skip migrations for persisted schema changes.
- Do not create autonomous AI actions; AI returns cited drafts until the user applies them.
