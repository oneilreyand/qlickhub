# E2E-SDLC-FLOW — Owner / Admin Path

**Status:** Disetujui
**Applicable Policy IDs:** DOC-005, RELEASE-001

## Inputs and preconditions

Workspace dengan anggota PO, Developer, dan QA; role Workspace tiap anggota benar (role global tidak
menentukan aksi di dalam Workspace).

## Actions and evidence

Dapat melakukan aksi PO (menyetujui Brief, mencatat Keputusan Rilis). Sebelum merge, menerapkan
migrasi `20261105000095` ke Production (ADR-039) dan memberi label `owner-approved`.

## Outputs and handoff

PR ter-merge dan alur diulang manual di Production (release.md §2).
