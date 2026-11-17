# MY-WORK-REPORT — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-002, DATA-006

## Data and relations

Membaca `tasks`, `task_activities`, `task_blockers`, kalender dan kapasitas (WORK-FOUNDATION). Data baru:
`task_relations` (`workspace_id` sumber, `source_task_id`, `target_task_id`, `type` = `blocks|relates_to|duplicates`,
`created_by`, unik (`source_task_id`, `target_task_id`, `type`), tidak boleh relasi ke diri sendiri).

## API and executable contract

Contract baru `myWorkReport.ts` dan `taskRelation.ts`. Endpoint: `GET /v1/me/work-report?from&to&workspaceId`
(+ `format=csv`), `GET/POST /v1/workspaces/:workspaceId/tasks/:taskId/relations`, `DELETE …/relations/:relationId`.
View-model UI di `organisms/myWorkReport/types.ts` dipetakan dari contract, bukan sebaliknya.

## Boundary notes

Terdampak: modul baru `myWork`, modul `tasks` (relasi), Web halaman baru, sidebar, `ReportPage`.
Tidak terdampak: aturan `FLOW-007` untuk orang lain, Leader Hub.
