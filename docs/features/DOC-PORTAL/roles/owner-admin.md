# DOC-PORTAL — Owner / Admin Path

**Applicable Policy IDs:** DOC-005, DOC-006, AI-020

## Inputs and preconditions

Clone repo dengan `docsys.config.json`; `npm run docs:extract` sudah dijalankan.

## Actions and evidence

- Buka portal (`npm run docs:portal`) untuk melihat stack, fitur, dan jumlah gap dokumen.
- Review PR Tier 2 yang menambah entri `quality/doc-baseline.json`; beri `owner-approved` hanya bila
  pengecualiannya sah.
- Dalam darurat, setujui `DOCSYS_MODE=report` dan pastikan alasannya tercatat di PR.

## Outputs and handoff

Keputusan pengecualian baseline dan label `owner-approved` di PR.
