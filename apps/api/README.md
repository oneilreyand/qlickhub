# API Application

Backend Express + Sequelize + PostgreSQL. HTTP routes, authorization policies, domain modules, database models/migrations, background jobs, and AI providers live under `src/`.

New production modules use a feature-first structure:

```text
src/modules/<domain>/
├── <domain>.routes.ts       # HTTP registration only
├── <domain>.controller.ts   # request parsing and response mapping
├── <domain>.service.ts      # use cases, policies, and transactions
├── <domain>.repository.ts   # Sequelize queries and persistence details
├── <domain>.mapper.ts       # persistence-to-contract DTO mapping
└── <domain>.policy.ts       # domain-specific authorization/transition rules
```

The bug module is the reference implementation. Models and migrations remain under `src/db`; migrations are canonical for database constraints, including project-scoped composite foreign keys.

Run `npm run db:migrate` before starting the API. The server only verifies the database connection; it never changes the schema automatically.

For production, set `DATABASE_URL`, `JWT_ACCESS_SECRET` (32+ characters), a comma-separated `CORS_ORIGIN` allowlist, and `DATABASE_SSL=true`. See the repository `.env.example`; the API fails to start if these production controls are absent.
