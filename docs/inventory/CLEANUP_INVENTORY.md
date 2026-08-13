# Work Hub Cleanup Candidate Inventory & Route Protection

**Status:** Audited (WH-0)  
**Date:** 2026-08-12  
**Owner:** Antigravity / QA-native Work Hub

---

## 1. Inventory Summary

| Candidate Item | Location | Current Usage / Imports | Access Restriction | Scheduled Action | Target Slice |
|---|---|---|---|---|---|
| `GenericPage.tsx` | `apps/web/src/pages/GenericPage.tsx` | **0 imports** across codebase | Unrouted | Delete file | `WH-6` |
| `ComponentShowcasePage.tsx` | `apps/web/src/pages/ComponentShowcasePage.tsx` | Imported in `App.tsx` (`/projects/:projectId/components`) | Isolated to `user?.role === 'admin'` in `AppShellLayout.tsx` | Remove route, delete page | `WH-6` |
| `sampleTableData` & `sampleColumns` | `apps/web/src/components/organisms/DataTable.tsx` | Demo exports in `DataTable.tsx` | Component Gallery showcase page only | Remove demo exports; retain reusable `DataTable` | `WH-6` |
| `RequirementsPage.tsx` | `apps/web/src/pages/RequirementsPage.tsx` | Active production route (`/projects/:projectId/requirements`) | Protected project route | Redirect to Work Hub requirement view; delete page after replacement live | `WH-6` |
| `TasksPage.tsx` | `apps/web/src/pages/TasksPage.tsx` | Active production route (`/projects/:projectId/tasks`) | Protected project route | Redirect to Work Hub task view; delete page after replacement live | `WH-6` |

---

## 2. Route Protection Guidelines

1. **No Early Deletions**: Do **NOT** remove `RequirementsPage.tsx` or `TasksPage.tsx` during `WH-1` through `WH-5`. They serve active user URLs.
2. **Redirect Compatibility**: In `WH-6`, `/projects/:projectId/requirements` and `/projects/:projectId/tasks` will redirect seamlessly to the corresponding Work Hub views (`/projects/:projectId/work?view=requirements` and `/projects/:projectId/work?view=tasks`) before any legacy file is deleted.
3. **Demo Isolation**: Component Gallery remains accessible only to Admin users (`user?.role === 'admin'`) as a component testing sandbox until full Work Hub UI is verified in `WH-6`.

---

## 3. Retained Core Shared UI Atoms & Molecules

The following shared UI atoms, molecules, and organisms are **NOT** cleanup candidates and MUST be retained:
- `Button.tsx`, `Badge.tsx`, `Avatar.tsx`, `ProgressBar.tsx`, `Tabs.tsx`
- `Modal.tsx`, `Drawer.tsx`, `Skeleton.tsx`, `Snackbar.tsx`
- `DataTable.tsx` (reusable data table structure)
- `FileDropzone.tsx`, `Accordion.tsx`, `Breadcrumbs.tsx`, `DatePicker.tsx`
