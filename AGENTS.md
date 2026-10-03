# Agent Workflow — Qlick Hub (Task Management & Collaboration Hub)

This file is the mandatory operating guide for every agent working in this repository. Qlick Hub is a unified Task Management & Collaboration platform connecting Product Owners, Developers (Frontend & Backend), and QA for end-to-end task orchestration and delivery.

## Source of truth

Start with the navigation map, then read every applicable SSoT before making changes:

1. [`docs/0_PRODUCT_KNOWLEDGE_MAP.md`](docs/0_PRODUCT_KNOWLEDGE_MAP.md) — mandatory entry point and role-specific reading paths; it is an index, not a competing policy source.
2. [`docs/1_ARCHITECTURE.md`](docs/1_ARCHITECTURE.md) — SSoT for domain model, hierarchy, RBAC, schema, and security.
3. [`docs/2_WORKFLOW_AND_ROLES.md`](docs/2_WORKFLOW_AND_ROLES.md) — SSoT for end-to-end role workflow, subtasks, QA test management, and release gates.
4. [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](docs/3_UI_ATOMIC_DESIGN_SYSTEM.md) — SSoT for atomic UI components, Stitch design tokens, and route layout.
5. [`docs/4_AGENT_DEV_GUIDELINES.md`](docs/4_AGENT_DEV_GUIDELINES.md) — SSoT for developer rules, AI work assurance, PostgreSQL test evidence policy, and handoff report template.
6. [`docs/5_AUTONOMOUS_AGENT_OPERATIONS.md`](docs/5_AUTONOMOUS_AGENT_OPERATIONS.md) — proposed target state (not in force) for autonomous operations.
7. [`docs/POLICY_REGISTRY.md`](docs/POLICY_REGISTRY.md) — stable identifiers pointing to approved SSoT rules; it never overrides the source document.
8. [`TODO.md`](TODO.md) — Current prioritized active backlog.

When documents conflict, use this priority: explicit user instruction → security constraints → SSoT Architecture & Workflow (`docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`) → UI Design System (`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`) → Agent Guidelines (`docs/4_AGENT_DEV_GUIDELINES.md`) → TODO.

## Core rules

- For all frontend work, follow [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](docs/3_UI_ATOMIC_DESIGN_SYSTEM.md). Reuse the Atomic Design system before adding markup or styles to a page.
- Work on exactly one TODO item or one tightly related subtask at a time.
- Before claiming work that changes the repository, configuration, data, or deployment, complete the capability-aware Work Readiness Assessment in `docs/4_AGENT_DEV_GUIDELINES.md` §2A. Do not call work `Ready` until every Acceptance Criterion has an objective evidence path; split or block it truthfully when required.
- Before repository-changing work, obtain either a bounded **Approval Window** or the explicit high-risk approval required by `docs/4_AGENT_DEV_GUIDELINES.md` §2A.A.1. Read-only inspection may establish facts, but it must not be used to infer approval, fill an unknown, or advance to a mutation.
- Merge agent pull requests only through tiered auto-merge (`AI-020`, [ADR-028](docs/adr/ADR-028-TIERED-AUTO-MERGE.md)): enable auto-merge after creating the PR; a Tier 2 PR (paths in `quality/tier2-paths.txt`) waits for the Owner's `owner-approved` label. Never add or remove that label, never push directly to `main`, and report the tier and any matched Tier 2 files.
- Cite applicable Policy IDs from `docs/POLICY_REGISTRY.md` in Feature Knowledge Cards, plans, and reports when a policy boundary is involved.
- Before editing, inspect the relevant code and identify the files likely to change.
- Do not make silent product, role, schema, migration, or workflow assumptions. Resolve the answer from the source-of-truth documents and current implementation. If evidence conflicts or a choice materially changes behavior/data, document the conflict and request an explicit decision; mark the TODO item `Blocked` when work cannot safely continue.
- Every plan must state confirmed facts, unresolved decisions, files likely to change, data/interface impact, authorization impact, migration risk, validation evidence, WRA result, AC-to-evidence mapping, and Change Impact Map. Add a Decision Snapshot with pro/con for material alternatives. Do not present guesses as repository facts.
- An AI-to-AI handoff must carry the evidence package defined in `docs/4_AGENT_DEV_GUIDELINES.md` §2A. The receiving verifier checks primary evidence and returns `Accepted`, `Accepted with gaps`, `Rejected`, or `Blocked`; another model's summary is not proof.
- Complete the evidence-backed quality review defined in `docs/4_AGENT_DEV_GUIDELINES.md` §2A.H before calling repository-changing work done; reuse, duplicate/overlapping behavior, obsolete or unused code, tests, and documentation must each have an explicit finding or evidence-backed `none found` result.
- Do not overwrite unrelated user changes, move existing code, or introduce a new framework without an explicit task.
- Keep the frontend as React + Vite + React Router + Redux Toolkit/Redux Thunk.
- Keep the backend as Express + TypeScript + Sequelize + PostgreSQL.
- Treat PostgreSQL through Sequelize as the default. Use parameterized raw SQL only for `pgvector`, indexes, analytics, or PostgreSQL-specific needs.
- Enforce authorization in backend policy/services. UI visibility is not authorization.
- Never expose `DATABASE_URL`, JWT secrets, Google Drive service-account credentials, or AI keys to the browser.
- Keep the Stitch design contract intact: Inter, primary brand lime `#B1E743` (with `#141413` charcoal text, a WCAG AAA-verified pair), emerald `#10B981`, amber `#F59E0B`, neutral `#64748B`, sidebar navy `#0B1C30`, 16px cards, accessible dark mode, and the WCAG 2.2 AA baseline defined in the UI SSoT.

## Documentation compliance

- Use `docs/features/FEATURE_TEMPLATE.md` for a user-visible workflow that spans roles or application layers, changes shared contracts/persistence, or introduces an authorization, QA evidence, or release-readiness boundary.
- A policy change must be recorded in an ADR and applied to the canonical SSoT before implementation. Reports and TODO entries are evidence/status, not policy sources.
- Keep one canonical definition and link to it. Do not copy policy prose into model-specific instruction files or feature documents.
- Run `npm run docs:check` for every documentation or policy change. It is part of `npm run validate` and the CI gate.
- If policy, contract, implementation, or evidence conflicts, stop and report the conflict instead of choosing one silently.
- Never copy `.env` values, credentials, tokens, connection strings, or service-account material into documents, TODO entries, reports, fixtures, or logs.

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
- Apply the responsive and Atomic decomposition gate in `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` §7 before completing frontend work: prove phone, tablet, and desktop behavior; split a component when its independent responsibilities or reusable interaction patterns no longer fit one Atomic layer.
- Use existing Tailwind/theme tokens; do not introduce arbitrary hex colors, one-off shadows, radii, typography, spacing, or parallel light/dark palettes. The Stitch colors above are the only product accents unless an explicit design decision adds another token.
- New or changed UI must be checked at phone, tablet, and desktop widths and must include keyboard focus, accessible names, minimum touch targets, label/icon status cues, loading, empty, error, disabled, and permission-denied states where relevant.
- Do not duplicate shared business calculations in React. Coverage, readiness, permissions, queue reasons, and release gates come from authenticated backend interfaces; the UI only presents them.
- Apply the database-relation, performance, and AI-technology gates in `docs/1_ARCHITECTURE.md` §6 and `docs/4_AGENT_DEV_GUIDELINES.md` §2A.I–J; a schema/query/performance/model decision without the required evidence remains blocked rather than assumed.

## Task lifecycle

Follow the canonical [six-stage flow](docs/4_AGENT_DEV_GUIDELINES.md#flow-ringkas-enam-tahap)
and its assurance requirements. Present the plan and Approval Window together for one consent,
then execute the bounded sequence without repeated checkpoints. Claim/create the task after
approval, keep one task identity through handoffs, and record applicable verification before
updating `TODO.md`. Use [the report template](AGENT_REPORT_TEMPLATE.md) for detailed evidence and
give the user a concise result with links. Pause at the canonical stop conditions.

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
- Do not create autonomous AI actions; AI returns cited drafts until the user applies them. Autonomous operational execution under docs/5 is a proposed target state and remains not in force until an activation ADR is approved.
