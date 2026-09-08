## Task

FIX-MOBILE-WEB-PUSH-RELIABILITY: make FCM discussion notifications reliable and honestly reported
on mobile Chrome.

## Outcome

Discussion notification persistence and the external FCM attempt now finish before a successful
comment operation resolves, removing the serverless suspension race reproduced by the original
integration test. Web clients now acquire tokens with the configured public VAPID key, mark push as
active only after backend registration succeeds, initialise the root service worker after worker
restarts, remove the current device token on logout, and preserve the existing task deep link without
duplicating background notification display.

The notification dropdown now distinguishes permission required, registration in progress,
registered, denied, unsupported, configuration/registration failure, and iOS Home Screen
installation-required states. A standalone Web App Manifest and application icons support the iOS
Home Screen prerequisite. The implementation and matching public VAPID setting were deployed to
Production on 2026-09-08; Preview was not changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`,
  `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`,
  `docs/4_AGENT_DEV_GUIDELINES.md`, and `docs/features/MOBILE_WEB_PUSH_RELIABILITY.md`.
- **Policy IDs:** `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-004`.
- **Data/interface impact:** No schema, migration, endpoint, request, or response-shape change. The
  existing `user_fcm_tokens` records remain canonical; discussion notifications are awaited before
  response completion. Delivery logs contain counts and notification type only.
- **Authorization impact:** None. Token endpoints remain authenticated self-service operations and
  discussion recipients remain backend-derived and Workspace-scoped.
- **Migration risk:** None. Rollback is source-only.

## Changed files

- `apps/api/src/modules/tasks/taskDiscussionService.ts` — waits for persisted discussion
  notification creation and the best-effort FCM attempt before returning.
- `apps/api/src/modules/notifications/__tests__/notificationApiIntegration.test.ts` — removes timing
  sleeps and proves notifications exist when comment creation resolves.
- `apps/api/src/services/fcmService.ts` — records redacted dispatch counts without user IDs, tokens,
  or payload content.
- `apps/web/src/config/firebase.tsx` — exposes the browser-public VAPID configuration value.
- `apps/web/src/lib/firebase/mobilePushSupport.ts` and tests — centralise iOS standalone detection,
  public configuration checks, and restart-safe service-worker URL construction.
- `apps/web/src/lib/firebase/fcmDevice.ts` and tests — register/unregister a device using VAPID and
  the existing authenticated notification API.
- `apps/web/src/hooks/useFcmNotifications.ts` — owns truthful registration states, preflight checks,
  and complete foreground notification-type mapping.
- `apps/web/src/features/notifications/components/NotificationBell.tsx`,
  `apps/web/src/features/notifications/components/NotificationDropdown.tsx`, and dropdown tests —
  present accessible activation, retry, denial, unsupported, active, and iOS installation states.
- `apps/web/src/lib/api/authService.ts` and tests — performs best-effort per-device token cleanup
  before logout without preventing session cleanup.
- `apps/web/public/firebase-messaging-sw.js` — initialises from its registered public configuration
  after restarts and delegates notification display/deep linking to Firebase.
- `apps/web/public/manifest.webmanifest`, `apps/web/public/icon-192.png`,
  `apps/web/public/icon-512.png`, `apps/web/public/apple-touch-icon.png`, and
  `apps/web/index.html` — add the standalone install contract and mobile icons.
- `apps/web/.env.example`, `apps/web/.env.production.example`, and
  `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` — document the browser-public VAPID requirement and preserve
  the private-key/service-account boundary.
- `docs/features/MOBILE_WEB_PUSH_RELIABILITY.md` — records requirements, boundaries, evidence, and
  release prerequisites.

## Validation

- Red reproduction: focused PostgreSQL discussion notification integration with both timing sleeps
  removed — failed 2/2 before the service fix because the query raced the detached notification
  promise.
- Focused PostgreSQL notification integration after the fix — passed 2/2 relevant tests, 14 skipped,
  zero failures.
- `npm --prefix apps/api run test:integration` — passed 396/396 tests across 93 suites against the
  configured local PostgreSQL test database; zero skipped and zero failures. Firebase delivery was
  an external seam with no active test device tokens.
- Focused FCM/device/logout/dropdown frontend suite — passed 15/15 tests across 5 files.
- `npm --prefix apps/web test` — passed 345/345 tests across 71 files. Existing React `act(...)`
  and Component Gallery nested-button warnings remain outside this task; no test failed.
- `npm --prefix packages/contracts test` — passed 61/61 tests across 18 suites after rerunning with
  permission for the test runner's temporary IPC socket; zero skipped and zero failures.
- `npm run validate` — documentation tests 5/5 and governance passed; lint completed with zero
  errors and 27 pre-existing warnings; contracts, API, and web typechecks passed.
- Targeted ESLint over every changed TypeScript/TSX notification file — zero errors and zero
  warnings.
- `npm run build` — contracts, API, and web production builds passed; Vite transformed 1,697
  modules.
- Built-artifact inspection — valid standalone manifest plus root messaging worker and 192 px,
  512 px, and Apple touch icons were present.
- Local production preview loaded successfully and enforced the authenticated `/login` boundary.
  The protected notification dropdown was not visually exercised with a seeded browser login.

## Risks or follow-up

- Production now has its Firebase-project-matching `VITE_FIREBASE_VAPID_KEY`; the live bundle,
  restart-safe worker, and valid Web App Manifest were verified without printing the key. Other
  deployment environments still require their own matching configuration before use.
- External delivery still requires real-device UAT with two authenticated users: Android Chrome over
  HTTPS, and iPhone/iPad after adding Qlick Hub to the Home Screen and opening it standalone. Verify
  foreground, background, closed-app, notification-tap deep link, logout, and re-login behavior.
- Until the device checks pass, this work must not be claimed as proven end-to-end mobile push
  delivery evidence.

## TODO update

- `FIX-MOBILE-WEB-PUSH-RELIABILITY` → `Blocked` pending real-device UAT only. Production
  configuration and artifact checks passed in deployment `dpl_3s4dRPodmwEtwuKLijxG4F4uvZgD`.
