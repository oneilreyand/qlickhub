# VERCEL-PRODUCTION-BRANCH — Developer Path

**Applicable Policy IDs:** DOC-005, FLOW-001, SDLC-001

## Inputs and preconditions

- Task atau bug fix yang dikerjakan pada feature branch lokal.

## Permitted actions and decisions

- Membuka PR dari feature branch ke `main`.
- Mengikuti alur Tier 1 / Tier 2 auto-merge sesuai ADR-028 untuk penggabungan ke `main`.
- Memverifikasi hasil build dan Preview deployment yang dihasilkan oleh branch `main`.
- Menyiapkan script migrasi database additive bila ada perubahan skema.
- Developer dilarang melakukan push atau merge ke branch `production`.

## Outputs and handoff

- Kode terintegrasi di branch `main` dan tersedia di Preview environment untuk pengujian QA.
