# Agent Workflow — Qlick Hub (Task Management & Collaboration Hub)

This file is the mandatory operating guide for every agent working in this repository. Qlick Hub is a unified Task Management & Collaboration platform connecting Product Owners, Developers (Frontend & Backend), and QA for end-to-end task orchestration and delivery.

## Source of truth

Read these SSoT documents before making changes:

1. [`docs/1_ARCHITECTURE.md`](docs/1_ARCHITECTURE.md) — SSoT for domain model, hierarchy, RBAC, schema, and security.
2. [`docs/2_WORKFLOW_AND_ROLES.md`](docs/2_WORKFLOW_AND_ROLES.md) — SSoT for end-to-end role workflow, subtasks, QA test management, and release gates.
3. [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](docs/3_UI_ATOMIC_DESIGN_SYSTEM.md) — SSoT for atomic UI components, Stitch design tokens, and route layout.
4. [`docs/4_AGENT_DEV_GUIDELINES.md`](docs/4_AGENT_DEV_GUIDELINES.md) — SSoT for developer rules, PostgreSQL test evidence policy, and handoff report template.
5. [`TODO.md`](TODO.md) — Current prioritized active backlog.

When documents conflict, use this priority: explicit user instruction → security constraints → SSoT Architecture & Workflow (`docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`) → UI Design System (`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`) → Agent Guidelines (`docs/4_AGENT_DEV_GUIDELINES.md`) → TODO.

## Core rules

- For all frontend work, follow [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](docs/3_UI_ATOMIC_DESIGN_SYSTEM.md). Reuse the Atomic Design system before adding markup or styles to a page.
- Work on exactly one TODO item or one tightly related subtask at a time.
- Before editing, inspect the relevant code and identify the files likely to change.
- Do not make silent product, role, schema, migration, or workflow assumptions. Resolve the answer from the source-of-truth documents and current implementation. If evidence conflicts or a choice materially changes behavior/data, document the conflict and request an explicit decision; mark the TODO item `Blocked` when work cannot safely continue.
- Every plan must state confirmed facts, unresolved decisions, files likely to change, data/interface impact, authorization impact, migration risk, and validation evidence. Do not present guesses as repository facts.
- Do not overwrite unrelated user changes, move existing code, or introduce a new framework without an explicit task.
- Keep the frontend as React + Vite + React Router + Redux Toolkit/Redux Thunk.
- Keep the backend as Express + TypeScript + Sequelize + PostgreSQL.
- Treat PostgreSQL through Sequelize as the default. Use parameterized raw SQL only for `pgvector`, indexes, analytics, or PostgreSQL-specific needs.
- Enforce authorization in backend policy/services. UI visibility is not authorization.
- Never expose `DATABASE_URL`, JWT secrets, Google Drive service-account credentials, or AI keys to the browser.
- Keep the Stitch design contract intact: Inter, primary brand lime `#B1E743` (with `#141413` charcoal contrast text for WCAG AAA compliance), emerald `#10B981`, amber `#F59E0B`, neutral `#64748B`, sidebar navy `#0B1C30`, 16px cards, and accessible dark mode.

## Data and test evidence

- Production and manual validation paths must use persisted records returned through authenticated backend interfaces. Never use hardcoded arrays, browser-only state, sample fallbacks, fabricated URLs, or mock adapters as production data.
- Database/interface integration tests must use a disposable PostgreSQL test database with canonical migrations. Seed contract-valid, realistic records through factories or setup helpers, then assert persisted rows, Workspace integrity, authorization, audit activity, and returned contracts.
- A fixture is permitted only inside test/contract support code, must be labelled as a fixture/factory, and must satisfy the same contracts and database constraints as production input. A fixture may not be described as live, production, end-to-end, or real-database evidence unless it was actually persisted and read back from PostgreSQL.
- Mocking is permitted only for a true external seam such as Firebase, email, Google Drive, or another unavailable third-party adapter. Do not mock Sequelize models, repository behavior, authorization, migrations, or internal backend interfaces in integration tests.
- Frontend tests may use contract-valid factories to exercise rendering and interaction, but they do not replace backend/database integration tests for a persisted workflow. Every data-driven vertical slice requires both levels when applicable.
- Never weaken, delete, skip, or rewrite a failing test merely to obtain green output. Fix the implementation or correct a stale expectation using confirmed product policy, and record why the expectation changed.
- Validate migrations from a clean database and inspect migration status against the intended environment. Destructive migrations require an explicit data-preservation/recovery plan and user approval when the product decision is not already documented.
- Record exact commands, pass/fail counts, skipped tests, warnings, database environment, and known gaps. “Build passed” or “tests passed” without the command and scope is not sufficient evidence.

## Frontend consistency

- Inspect `apps/web/src/components/ui` and the Component Gallery before creating frontend markup. Reuse an existing atom, molecule, organism, layout pattern, icon treatment, spacing scale, and interaction state whenever one already matches.
- Pages coordinate routing, data loading, permissions, and composition. Repeated presentation and interactions belong in the Atomic Design system at the smallest reusable level.
- Use existing Tailwind/theme tokens; do not introduce arbitrary hex colors, one-off shadows, radii, typography, spacing, or parallel light/dark palettes. The Stitch colors above are the only product accents unless an explicit design decision adds another token.
- New or changed UI must be checked at desktop and mobile widths and must include keyboard focus, accessible names, minimum touch targets, label/icon status cues, loading, empty, error, disabled, and permission-denied states where relevant.
- Do not duplicate shared business calculations in React. Coverage, readiness, permissions, queue reasons, and release gates come from authenticated backend interfaces; the UI only presents them.

## Task lifecycle

1. **Claim** — Change the selected item in `TODO.md` to `In progress`, with agent name/date if known.
2. **Understand** — Read applicable delivery-plan/design sections and inspect current implementation.
3. **Plan briefly** — State confirmed facts, unresolved decisions, files, data/interface impact, authorization, risks, and validation approach.
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
- Persisted workflows were proven against PostgreSQL; frontend fixtures alone are insufficient.
- No production mock/local-only data or duplicated browser-side business calculation was introduced.
- Activity/audit event is created for a user-visible mutation when required by the delivery plan.
- Documentation and TODO status are updated.

## Working boundaries

- Do not mark a task complete because code was written but not verified.
- Do not silently use fake data in a production path. Mock fixtures must live in the contracts/test area and be labelled.
- Do not make direct database calls from frontend features.
- Do not skip migrations for persisted schema changes.
- Do not create autonomous AI actions; AI returns cited drafts until the user applies them.
