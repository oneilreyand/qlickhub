# SUBTASK-SCHEDULE-WITHIN-FEATURE — QA Path

**Status:** Disetujui
**Disetujui oleh:** Owner, 2026-11-07 (`ok`, G0–G3 dan K1/L1/L2)

**Applicable Policy IDs:** DOC-005, AUTH-002, TEST-001

## Inputs and preconditions

Test data disimpan melalui factories pada PostgreSQL disposable dengan canonical migrations; role/Workspace valid.

## Actions and decisions

Menguji 400/409, range inklusif, done/canceled, legacy, reopen, atomicity, privacy, concurrency serta UI. Tidak mengedit planning sebagai QA.

## Outputs and handoff

Evidence sesuai AC, Bug/retest bila gagal, independent review dan sign-off sesuai workflow; tidak memalsukan Test Result dari fixture-only UI.

Authorization: [../authorization.md](../authorization.md); workflow kanonikal:
[Workflow and Roles](../../../2_WORKFLOW_AND_ROLES.md). Tidak ada permission baru dari dokumen ini.
