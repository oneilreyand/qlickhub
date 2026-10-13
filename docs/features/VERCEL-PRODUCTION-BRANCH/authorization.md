# VERCEL-PRODUCTION-BRANCH — Authorization Matrix

**Applicable Policy IDs:** DOC-005, AUTH-002, AI-013, AI-020, SDLC-001

| Aksi | Owner / Admin | PO | Developer | QA | AI Agent | Penegakan dan Batasan |
| --- | --- | --- | --- | --- | --- | --- |
| Buat branch `production` awal | Diizinkan | Dilarang | Dilarang | Dilarang | Hanya atas persetujuan G3 | GitHub repo permissions |
| Push langsung ke `production` | Dilarang | Dilarang | Dilarang | Dilarang | Dilarang | GitHub branch protection ruleset |
| Buka PR `main` → `production` | Diizinkan | Diizinkan | Diizinkan | Diizinkan | Diizinkan (draft) | GitHub Pull Request |
| Auto-merge pada PR `production` | Dilarang | Dilarang | Dilarang | Dilarang | Dilarang | Aturan ADR-031 (dilarang keras) |
| Merge PR `main` → `production` | Diizinkan (Owner eksklusif) | Dilarang | Dilarang | Dilarang | Dilarang | GitHub protected branch ruleset & AI-013 |
| Eksekusi `npm run db:migrate:prod` | Diizinkan (Owner eksklusif) | Dilarang | Dilarang | Dilarang | Dilarang | Kredensial MIGRATION_DATABASE_URL |
| Ubah setting Vercel Production Branch | Diizinkan (Owner eksklusif) | Dilarang | Dilarang | Dilarang | Dilarang | Vercel team dashboard permissions |

UI visibility is not authorization. Seluruh batasan otorisasi ditegakkan pada level GitHub branch protection ruleset, token akses Vercel, dan kredensial database Session Pooler rilis.
