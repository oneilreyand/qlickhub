# Web Application

Frontend for Qlick Hub: React 18 + Vite + TypeScript, React Router, Redux Toolkit/Redux Thunk, and
Tailwind CSS. It consumes the shared API contracts from `@qlick/contracts` (`packages/contracts`).

## Structure

```text
src/
├── app/          # root App component and route setup
├── components/
│   └── ui/       # Atomic Design system: atoms, molecules, organisms, templates
├── config/       # Firebase client and feature-visibility flags
├── features/     # domain features (leader, myTasks, notifications, qa, reports, tasks, workspaces)
├── hooks/        # shared React hooks
├── lib/          # API client, permissions, i18n, theme, storage, and utilities
├── pages/        # routed pages: routing, data loading, permissions, composition
├── store/        # Redux Toolkit store and slices (auth, workspace, folder, task, report, ui)
└── test/         # Vitest setup and labelled contract-valid fixtures
e2e/              # Playwright browser specs
```

The `@` import alias resolves to `src/`. Before adding markup or styles, reuse the Atomic Design
system and follow [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../../docs/3_UI_ATOMIC_DESIGN_SYSTEM.md).
Authorization, readiness, and other business rules come from the backend; the UI only presents them.

## Configuration

Run `npm run env:setup:local` from the repository root to create the ignored
`apps/web/.env.local` from [`.env.example`](.env.example). Every `VITE_*` value is embedded in the
browser bundle, so never put secrets there. See
[`docs/DEPLOYMENT_AND_ENVIRONMENTS.md`](../../docs/DEPLOYMENT_AND_ENVIRONMENTS.md) for Preview and
Production.

## Scripts

Run from `apps/web/`, or from the root with `npm run dev:web`, `npm run build:web`, and
`npm run typecheck:web`.

| Script              | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server on `http://localhost:3000`. |
| `npm run build`     | Type-check and build the production bundle.           |
| `npm run typecheck` | Type-check without emitting files.                    |
| `npm run test`      | Run Vitest component and unit tests (jsdom).          |
| `npm run test:e2e`  | Run Playwright browser specs in `e2e/`.               |
