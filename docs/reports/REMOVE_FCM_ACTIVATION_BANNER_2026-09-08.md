# Agent Report — Remove FCM Activation Banner

## Task

REMOVE-FCM-ACTIVATION-BANNER: remove “Aktifkan notifikasi FCM untuk update tugas real-time.”
from the notification dropdown.

## Outcome

The notification dropdown no longer renders the FCM permission/registration banner, including its
technical sentence and `Izinkan` button, while permission is required or registration is in
progress. Registered, denied, unsupported, installation-required, and retryable error feedback are
unchanged. FCM registration, push delivery, recipients, and backend behavior are unchanged.

## Source of truth and impact

- **Applicable SSoT:** `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`,
  `docs/4_AGENT_DEV_GUIDELINES.md`, and `docs/features/MOBILE_WEB_PUSH_RELIABILITY.md`.
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. No API request, response, or persisted data changed.
- **Authorization impact:** None.
- **Migration risk:** None. No schema or migration changed.

## Changed files

- `apps/web/src/features/notifications/components/NotificationDropdown.tsx` — removes the FCM
  activation banner and its obsolete support prop.
- `apps/web/src/features/notifications/components/NotificationBell.tsx` — stops passing the removed
  support prop.
- `apps/web/src/features/notifications/__tests__/NotificationDropdown.test.tsx` — proves the banner
  remains absent for both permission-required and registration-in-progress states.
- `docs/features/MOBILE_WEB_PUSH_RELIABILITY.md` — aligns the active feature card with the approved
  presentation behavior.
- `TODO.md` — records task lifecycle and evidence.

## Validation

- `npm --prefix apps/web run test -- src/features/notifications/__tests__/NotificationDropdown.test.tsx`
  — passed 1/1 file and 5/5 tests; 0 failed, skipped, or todo.
- `npm --prefix apps/web run test` — passed 71/71 files and 348/348 tests; 0 failed, skipped, or todo.
  Existing React `act(...)` and nested-button warnings remain in unrelated test areas.
- `npm --prefix apps/web run typecheck` — passed with 0 TypeScript errors.
- `npm --prefix apps/web run build` — passed; 1,697 modules transformed and the production bundle
  emitted successfully.
- Targeted ESLint for the three changed TypeScript/TSX files — passed with 0 errors and 0 warnings.
- `npm run docs:check` — passed 5/5 documentation governance tests and the documentation checker.
- Targeted Prettier check and `git diff --check` — passed.
- Static production-source search — confirmed the removed sentence has no remaining runtime use.

## Risks or follow-up

- No live authenticated dropdown session was available for manual desktop/mobile visual inspection.
  The changed states are covered through the rendered component regression test; the change only
  removes markup and does not alter the dropdown container or remaining responsive layout.

## TODO update

- `REMOVE-FCM-ACTIVATION-BANNER` → `Done`.
