# TASK-READ-ACCESS — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-001

## Data and relations

Tidak ada tabel, kolom, indeks, atau migrasi baru. Pemeriksaan membaca `tasks`
(`id`, `parent_task_id`, `assignee_id`, `reporter_id`) dalam Workspace yang sama.

## API and executable contract

Tidak ada endpoint atau field baru. Route Phase 1 dapat menjawab 403 `FORBIDDEN` (Problem Details
yang sama dengan detail task) bagi Developer/QA tanpa akses task. Bentuk respons sukses tidak
berubah; `packages/contracts` tidak diubah.

## Boundary notes

Biaya tambahan per request Developer/QA: satu `SELECT` task dan satu `COUNT` Subtask. Planner tidak
terkena query tambahan.
