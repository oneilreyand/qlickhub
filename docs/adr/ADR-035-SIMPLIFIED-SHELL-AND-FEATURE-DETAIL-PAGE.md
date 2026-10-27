# ADR-035: Simplified Shell and Feature Detail as a Page

**Status:** Accepted — effective when merged
**Date:** 2026-10-27
**Decision owner:** Product (Owner) — user approval in Claude chat, 2026-10-27
**Implementation stakeholders:** Frontend, Backend (route redirects, read models), QA, and AI agents
**Feature:** [SIMPLE-UI-DELIVERY-FLOW](../features/SIMPLE-UI-DELIVERY-FLOW/README.md)
**Policy IDs:** UI-001, UI-002, UI-003, UI-004, UI-005, DOC-002, DOC-005, SDLC-001

## Context

The UI SSoT ([3_UI_ATOMIC_DESIGN_SYSTEM.md](../3_UI_ATOMIC_DESIGN_SYSTEM.md) §2) defines a 3-panel
`/work` layout whose right panel is `TaskDetailDrawer`. In the code that drawer now holds 8 tabs
(Detail Task, Brief Produk, Requirement, Jejak Delivery, Bug, Subtask, Aktivitas, Diskusi) in
`apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` (1,375 lines) and opens full screen
(`defaultFullScreen={true}`) above the Sidebar and Header (`molecules/Drawer.tsx`, `fixed inset-0`).
Role work is split across large desks (`DevWorkingDesk`, `QaTestingDesk`, `PoTeamICardGrid`). The
approved problem statement for SIMPLE-UI-DELIVERY-FLOW (G0, 2026-10-27) records that users lose
context and cannot see who hands work to whom.

The target design was produced as a private claude.ai Design canvas. A private link cannot be an
SSoT: repository readers and other agents cannot open it.

## Decision

1. **Shell.** The application shell keeps a persistent Sidebar on desktop (≥1024px) with logo,
   workspace selector, four primary routes (Ringkasan, Task Hub, Tugas Saya, Laporan), the folder
   tree, and the profile. The Header keeps the current 80px height (P3.6) until a later slice
   re-evaluates it with evidence. Below 1024px the Sidebar becomes a toggled menu.
2. **Feature detail is a page, not a drawer.** A root Feature opens in the content area with the
   Sidebar visible and a four-stage stepper: Plan · PRD · Task · Apply. Existing content maps as:
   Diskusi → Plan; Brief Produk + Requirement + AC → PRD; Detail Task + Subtask → Task; Aktivitas,
   Bug, and Jejak Delivery stay reachable from the page header. No existing data becomes
   unreachable.
3. **Work detail per role is a page.** A subtask, QA test assignment, or PO decision opens as a
   role-specific detail page that starts with the handing-over person and their message, one work
   area, and one primary action.
4. **Drawer scope.** `Drawer` remains for small, self-contained tasks (folder picker on phone, short
   forms). It is no longer the container for Feature or work detail.
5. **Routes.** Existing URLs keep working: `?taskId=` deep links and
   `/projects/:projectId/tasks/:taskId` redirect to the new pages. Final route names are fixed in the
   Feature's [contracts.md](../features/SIMPLE-UI-DELIVERY-FLOW/contracts.md) before build.
6. **Design source.** The authoritative design for this change is the exported images committed in
   [`docs/features/SIMPLE-UI-DELIVERY-FLOW/design/`](../features/SIMPLE-UI-DELIVERY-FLOW/design/README.md),
   including Light, Dark, and phone variants. The claude.ai canvas is a working file only.
7. **Tokens.** Colors, type, spacing, and theme treatment come from the existing Stitch tokens and
   the Light/Dark contract ([ADR-034](ADR-034-UI-THEME-CONTRACT-AND-COVERAGE-GATE.md)); design
   images express layout and hierarchy, not new token values.
8. **Transition.** New pages replace old desks per role behind a feature flag. An old desk is removed
   only after its replacement passes E4 for that role.

## SSoT changes on acceptance (DOC-002)

| Document                                                           | Change                                                                                                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [3_UI_ATOMIC_DESIGN_SYSTEM.md](../3_UI_ATOMIC_DESIGN_SYSTEM.md) §2 | Replace the 3-panel diagram's right-panel `TaskDetailDrawer` with: Sidebar + content area; Feature detail page with stage stepper; role work-detail pages; drawer limited per Decision 4 |
| 3_UI_ATOMIC_DESIGN_SYSTEM.md §3                                    | Add Feature detail, Test Case create/run, and release routes once named in contracts.md; mark redirected legacy routes                                                                   |
| 3_UI_ATOMIC_DESIGN_SYSTEM.md §5                                    | Add `FeatureStageStepper` and `HandoffTimeline` (and `WorkQueueItem` if the reuse audit requires it) when they are built                                                                 |
| [docs/ux/UX_MATRIX.md](../ux/UX_MATRIX.md)                         | Update the screens and states for Task Hub, Feature detail, Tugas Saya per role, QA pages, and release pages                                                                             |
| [POLICY_REGISTRY.md](../POLICY_REGISTRY.md)                        | No new policy ID; UI-001 to UI-005 continue to apply                                                                                                                                     |

These edits are made in the same pull request that marks this ADR Accepted, before slice 1 build.

## Consequences

- Users keep navigation and context while reading Feature or work detail.
- `TaskDetailDrawer` and the role desks are decomposed into pages over several slices; tests that
  target them are rewritten per slice.
- Legacy deep links require redirect tests.
- Design must be exported to the repository and kept current; a design change after acceptance is a
  normal documentation change reviewed with the slice that implements it.
- No API, database, or authorization change is made by this ADR itself; slice-specific data changes
  are covered by the Feature's contracts.md and, for releases, a separate ADR.

## Alternatives considered

- **Keep the drawer, only stop it covering the Sidebar** (Quick Card DETAIL-DRAWER-KEEP-SIDEBAR) —
  rejected as the long-term layout because 8 tabs remain in one container; retained only as an
  optional interim fix.
- **Redesign everything in one release** — rejected in the Feature's G1 (Opsi B) for risk and
  rollback reasons.
- **Treat the private canvas as the source** — rejected because repository readers and agents cannot
  open it.
