# Mobile Web Push Reliability

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-08
**Applicable Policy IDs:** `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-004`

## 1. Tujuan dan Pengguna

Make browser push notifications truthful and reliable for authenticated Qlick Hub users on mobile
Chrome, with discussion notifications as the initiating defect. Android Chrome is supported over
HTTPS. On iOS/iPadOS, notification activation is supported only after Qlick Hub is added to the Home
Screen and opened as a standalone web app. This slice does not change who receives a notification,
make external FCM delivery transactional, deploy to Production, or add a native mobile application.

## 2. Requirement dan Acceptance Criteria

- **MWP-R1:** The client supplies the configured public VAPID key when obtaining a Firebase Web Push
  token and reports active only after the authenticated backend confirms token registration.
- **MWP-R2:** The root Firebase service worker can initialise after its process restarts without an
  open page sending runtime configuration.
- **MWP-R3:** Android Chrome users receive truthful registered, denied, unsupported, and failure
  states; iOS users outside standalone mode receive Home Screen installation guidance. The
  notification dropdown does not present an activation banner while permission is required or
  registration is in progress.
- **MWP-R4:** A discussion mutation completes its persisted notification and FCM delivery attempt
  before the request can be suspended by a serverless runtime.
- **MWP-R5:** Explicit logout unregisters and deletes the current device token on a best-effort basis
  without blocking session logout.
- **MWP-R6:** Notification payloads retain a task deep link and do not create duplicate background
  notifications.

The platform requirements follow the official
[Firebase Web Messaging setup](https://firebase.google.com/docs/cloud-messaging/web/get-started)
and [WebKit Home Screen Web Push model](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## 3. Alur Lintas Peran

Any authenticated Workspace member may activate notifications for their own browser. A discussion
author continues to notify only the existing server-derived recipient set: assignee, reporter,
explicit mentions, replied-to author, or related `@channel` stakeholders, excluding the author.
Owner, Admin, PO, Developer, and QA use the same per-device activation flow. Failure to deliver an
external push never rolls back a valid discussion comment.

## 4. Data dan Relasi

The existing `user_fcm_tokens` relation remains the canonical device-token store and continues to
cascade with its User. No table, index, migration, audit event, or Workspace ownership rule changes.
Firebase tokens and service-account material must not appear in logs or documentation; delivery
diagnostics contain counts and notification type only.

## 5. API dan Shared Contract

The existing authenticated `POST /v1/notifications/fcm-token` and
`DELETE /v1/notifications/fcm-token` contracts remain unchanged. The browser supplies the existing
`RegisterFcmTokenInput` or `UnregisterFcmTokenInput`; no response shape changes. Discussion continues
through the existing Task Comment interface.

## 6. Authorization

Token registration and unregistration remain authenticated self-service operations bound to
`req.user.userId`. Discussion recipient derivation remains backend-owned and Workspace-scoped. No
role, RBAC, membership, or UI-only authorization behavior changes.

## 7. UI dan Interaction States

The existing notification dropdown presents `registered`, `denied`, `installation required`,
`unsupported`, and retryable `error` feedback. The internal `checking`, `permission required`, and
`registering` states remain part of device registration but intentionally render no activation
banner in the dropdown. The remaining feedback reuses the current notification organism styling
and approved lime, amber, red, stone, and dark-mode tokens. Retry controls retain accessible names,
disabled behavior, and a minimum 44-pixel touch target. A Web App Manifest enables standalone Home
Screen launch.

## 8. Pengujian dan Evidence

- Frontend tests cover platform detection, public configuration validation, VAPID token acquisition,
  backend-confirmed registration, retry/error presentation, iOS installation guidance, and logout
  cleanup through the mocked external Firebase seam.
- PostgreSQL integration tests prove ordinary discussion and `@channel` notifications are persisted
  before the comment operation returns, without timing sleeps.
- Production builds must contain the root service worker and Web App Manifest.
- Android Chrome and iOS Home Screen delivery require real-device UAT with two authenticated users;
  simulated Firebase tests are not claimed as external delivery evidence.

## 9. Release dan Readiness

No deployment or Firebase Console mutation is part of this implementation task. Each deployment
environment must receive its matching browser-public Firebase config and public VAPID key before
release. Rollback is source-only because there is no schema migration. Production remains unchanged
until separately authorized.

## 10. Traceability

`MWP-R1`–`MWP-R6` map to the notification bell/hook, Firebase device client, root messaging service
worker, Web App Manifest, Task Discussion service, notification PostgreSQL integration test, focused
frontend tests, and the final task report. The originating defect is a mobile Chrome recipient not
receiving a discussion push while the existing UI could show an unverified active state.
