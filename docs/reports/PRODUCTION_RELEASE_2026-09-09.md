# Production Release — 2026-09-09

## Scope

Deployed the complete current working tree to Vercel Production at the user's explicit request.
This deployment includes the Discussion author-only mutation change and all other working-tree
changes present at deployment time.

## Preflight

- `npm run env:check` — passed with 0 warnings; no environment values printed.
- `npm run validate` — passed; documentation governance passed, lint had 0 errors and 25 existing
  warnings, and all typechecks passed.
- `npm run build` — passed; contracts, API, and frontend builds completed, Vite transformed 1,697
  modules.
- No migration files were present in the working-tree diff; no Production migration was run.

## Deployment

- Command: `vercel --prod --yes`
- Project: `oneilreyands-projects/qlickhub`
- Deployment ID: `dpl_EafYgRdw7mjG8ADAWAdKZvkjGsrg`
- Deployment URL: `https://qlickhub-7utdfef1g-oneilreyands-projects.vercel.app`
- Inspector: `https://vercel.com/oneilreyands-projects/qlickhub/EafYgRdw7mjG8ADAWAdKZvkjGsrg`
- Target: `production`
- Result: `READY`
- Canonical alias: `https://qlickhub.vercel.app`
- Vercel build completed successfully and outputs were deployed.

## Verification

- Deployment output confirmed the Production build completed and deployment reached `READY`.
- Direct HTTP smoke checks for `/`, `/v1/health`, and unauthenticated `/v1/tasks` could not be
  executed from this session because the required network escalation was rejected after the tool
  usage limit was reached. No health, database, or auth-guard result is claimed here.

## Risk and follow-up

- The complete working tree was intentionally deployed, including unrelated changes, per explicit
  user instruction.
- Run the documented Production smoke checks when network access is available: root/login, `/v1`,
  `/v1/health` with database connectivity, CORS, unauthenticated protected endpoint rejection,
  and one authenticated persisted Workspace journey.
