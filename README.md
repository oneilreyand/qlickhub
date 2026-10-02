# Qlick Hub

Qlick Hub is a unified Task Management & QA-native delivery workspace connecting Product Owners, Developers, and QA. It uses npm workspaces for the React/Vite web app, Express API, and shared API contracts.

## Documentation

Start with [`docs/0_PRODUCT_KNOWLEDGE_MAP.md`](docs/0_PRODUCT_KNOWLEDGE_MAP.md). It is the mandatory
entry point for people and AI agents: it gives role-specific reading paths and explains where each
kind of truth lives. Agents must also follow [`AGENTS.md`](AGENTS.md).

The canonical rules live in four Single Source of Truth (SSoT) documents:

| SSoT Document                                                                | Scope & Focus                                                                                                        |
| :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| [**`docs/1_ARCHITECTURE.md`**](docs/1_ARCHITECTURE.md)                       | Domain Model, Hierarchy (`Workspace → Folder → Feature/Story`), RBAC, Database Schema & Security.                    |
| [**`docs/2_WORKFLOW_AND_ROLES.md`**](docs/2_WORKFLOW_AND_ROLES.md)           | End-to-End Role Workflow (Owner, PO, Dev, QA), Developer Specialties, Subtask & Bug Lifecycles, Release Gates.       |
| [**`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`**](docs/3_UI_ATOMIC_DESIGN_SYSTEM.md) | Atomic UI System (`apps/web/src/components/ui/`), Stitch Design Tokens (`#B1E743` Lime), Routes & Component Gallery. |
| [**`docs/4_AGENT_DEV_GUIDELINES.md`**](docs/4_AGENT_DEV_GUIDELINES.md)       | AI Agent & Developer Operating Rules, Definition of Done, PostgreSQL Test Evidence Policy, and Report Template.      |

Supporting documents link to the SSoT and never override it:

- [`docs/POLICY_REGISTRY.md`](docs/POLICY_REGISTRY.md) — stable Policy IDs that point to approved SSoT rules.
- [`docs/adr/`](docs/adr/README.md) — why architectural and product decisions were made.
- [`docs/features/`](docs/features/README.md) — Feature Catalog, Role Flows, and Feature Knowledge Cards.
- [`docs/plans/`](docs/plans/README.md) — plans and proposals; not policy.
- [`docs/reports/`](docs/reports/README.md) — observed verification evidence; not policy.
- [`TODO.md`](TODO.md) — active backlog and status.

When documents conflict, follow the precedence defined in [`AGENTS.md`](AGENTS.md).

## Local development

1. Install Node 24 with your version manager (`nvm use` reads `.nvmrc`).
2. Install the locked dependency set with `npm ci`.
3. Run `npm run env:setup:local` to create the two ignored local env files without overwriting
   existing configuration.
4. Update `.env` and `apps/web/.env.local` as needed, then run `npm run env:check`. Never commit
   credentials.
5. Apply local migrations with `npm run db:migrate`.
6. In separate terminals, start the API with `npm run dev:api` and the web app with
   `npm run dev:web`.

The web app runs at `http://localhost:3000`; the API defaults to port `4000`.

For the complete Local → Preview → Production configuration, URL routing, secret boundaries,
migration safety, deployment, and rollback flow, read
[`docs/DEPLOYMENT_AND_ENVIRONMENTS.md`](docs/DEPLOYMENT_AND_ENVIRONMENTS.md).

## Quality checks

- `npm run lint` — lint API, web, shared contracts, and tests.
- `npm run format` — apply repository formatting.
- `npm run typecheck` — type-check all workspaces.
- `npm run validate` — run the fast static checks used by CI.
- `npm run test` — run contracts, web tests, and API integration tests. It requires the test
  database and migrations, as configured in `.env.example`.

Git commits run a fast staged-file hook that formats and lints only the files being committed.
The hook is installed by `npm ci` or `npm install` through the repository `prepare` script.

The formatter is introduced incrementally: use the commit hook for routine changes. A full-repository
format pass is deliberately separate work because the existing codebase predates this configuration.
