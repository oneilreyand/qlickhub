# Qlick Hub

Qlick Hub is a QA-native delivery workspace. It uses npm workspaces for the React/Vite web app,
Express API, and shared API contracts.

## Local development

1. Install Node 24 with your version manager (`nvm use` reads `.nvmrc`).
2. Install the locked dependency set with `npm ci`.
3. Copy `.env.example` to `.env`, then provide local PostgreSQL and Firebase values as needed.
   Never commit `.env` or credentials.
4. Apply local migrations with `npm run db:migrate`.
5. In separate terminals, start the API with `npm run dev:api` and the web app with
   `npm run dev:web`.

The web app runs at `http://localhost:3000`; the API defaults to port `4000`.

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
