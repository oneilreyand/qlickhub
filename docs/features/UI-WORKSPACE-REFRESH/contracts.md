# UI-WORKSPACE-REFRESH — Data, API, and Shared Contracts

**Applicable Policy IDs:** CONTRACT-001, DATA-001, UI-001, DOC-005

## Data and relations

Tidak ada entitas, relasi, atau migration baru. UI membaca root Feature dan subtask dalam Workspace
terautentikasi. Kanban v1 membaca subtask dari parent Feature yang dipilih; ia tidak menyimpan state
browser sebagai sumber data produksi dan tidak melakukan write.

## API and executable contract

Kontrak kanonis tetap `packages/contracts/src/task.ts`. Pembacaan root task memakai query task yang
sudah ada; Kanban memakai `taskService.listSubtasks(workspaceId, parentTaskId, page, limit)` dan
backend `listSubtasksImpl`. Laporan kapasitas tetap memakai interface terautentikasi yang digunakan
`capacityService` dan `TeamCapacityTimeline`.

## Boundary notes

- Frontend: shell/theme, Task Hub, detail Feature, My Tasks, dan Report presentation.
- Backend, endpoint, kontrak bersama, policy service, DB schema/migration, dan audit activity: **tidak
  berubah pada v1**.
- Bila pagination, aggregate, atau action yang dibutuhkan UI tidak tersedia dari interface yang ada,
  Phase berhenti untuk keputusan contract baru; UI tidak menghitung readiness/coverage dari daftar
  parsial.
