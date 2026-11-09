# FEAT-PRD-MERMAID-STUDIO — Data dan Shared Contracts

**Status:** Disetujui
**Disetujui:** Owner (Reyand), 2026-11-09, balasan `ok` untuk paket P1–P2.
**Applicable Policy IDs:** DOC-005, SDLC-001, CONTRACT-001, DATA-001, UI-001, TEST-001

Canonical: `packages/contracts/src/prdDiagram.ts`. Descriptor schemaVersion/id/title/revision/source adalah hasil parse dari satu blok Markdown; source tidak diduplikasi. Tidak ada endpoint, model atau migrasi baru. API existing: `PUT /v1/workspaces/:workspaceId/feature-specs/:specId/sections/:section`, save/get Product Brief dan task description. Parent version guard hanya dijanjikan pada Feature Spec; revision blok bukan server lock. Detail format dan limit: [breakdown.md](breakdown.md).
