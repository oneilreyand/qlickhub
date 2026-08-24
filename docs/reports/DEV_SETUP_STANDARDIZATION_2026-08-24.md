## Task

DEV-SETUP: Standardize the local development baseline.

## Outcome

The npm workspace now declares the Node 24 / npm 10 development baseline used by CI, has shared
formatting and linting configuration, installs a staged-file pre-commit hook, and documents the
local run and verification flow. CI runs the same lint and typecheck validation through
`npm run validate`.

Data/interface impact: none. Authorization impact: none. Migration risk: none.

## Changed files

- `.nvmrc` — pins the development Node major version to 24.
- `.editorconfig`, `.prettierrc.json`, `.prettierignore`, `.lintstagedrc.json` — establish incremental editor, formatter, and staged-file rules.
- `eslint.config.mjs` — adds the shared TypeScript/React lint baseline; existing `any` usage remains explicitly out of scope for this tooling slice.
- `.husky/pre-commit` — runs staged formatting and linting before a commit.
- `package.json`, `package-lock.json` — add reproducible engines, quality scripts, and tooling dependencies.
- `.github/workflows/ci.yml` — reads the Node version from `.nvmrc` and runs `npm run validate`.
- `README.md` — documents installation, local services, commands, and incremental formatter adoption.
- `TODO.md` — records the completed setup task.

## Validation

- `npm run prepare` — passed; Husky hook activated in the local Git configuration.
- `npx lint-staged` — passed; no staged files were present to process.
- `npm exec prettier -- --check README.md package.json eslint.config.mjs .prettierrc.json .lintstagedrc.json .github/workflows/ci.yml` — passed.
- `npm run validate` — passed: lint completed with 0 errors and 27 pre-existing warnings; contracts, API, and web typechecks passed.
- `npm run build` — passed for contracts, API, and web. Vite emitted the existing >500 kB chunk advisory.

## Risks or follow-up

- The current host runs Node 20.12.2. The repository now requires Node 24, which matches the existing CI baseline and current API/lint dependency engines. Use `nvm use` after installing Node 24.
- A full `npm run format` changes 384 legacy files. It is intentionally not part of CI or the commit hook; staged files are formatted incrementally. Schedule a dedicated formatting migration before making a repository-wide formatting check required.
- Lint reports 27 non-blocking pre-existing warnings. Resolve them as their owning code is edited, then promote selected rules to errors in a dedicated lint-hardening task.
- `npm run test` was not run because this configuration-only task does not alter application behavior and the API integration suite requires a prepared PostgreSQL test database.

## TODO update

- DEV-SETUP: Standardize the local development baseline → Done
