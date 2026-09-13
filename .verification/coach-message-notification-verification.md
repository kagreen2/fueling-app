# Coach-message notification verification

Date: 2026-09-13

## Implemented

- Added authenticated `POST /api/chat/notify-athlete`.
- The route requires a signed-in user, verifies the message exists, confirms the actor is the message sender or an authorized coach/admin/super-admin, and sends a push notification only to the message receiver.
- Push copy is neutral: `New message from your coach` / `You have a new message in Fuel Different.` No message preview or health information is included.
- The athlete deep link is `/athlete/dashboard` so the existing chat/unread experience remains the source of truth.
- The shared ChatPanel now calls the route after a successful staff-authored message insert.
- Admin-created coach welcome messages also request the same notification after insert.
- The FUEL 42 completion route sends the same push directly after its automated coach welcome message.

## Validation

- Focused ESLint passed for the new notification route and the FUEL 42 completion route.
- `npm run test:fuel42` passed.
- `git diff --check` passed.
- Unauthenticated production POST to `/api/chat/notify-athlete` returned HTTP 200 from the current deployed app, which indicates the new route is not yet present on the deployed version and must not be treated as a live validation of the new authorization behavior.

## Build blocker

The local production build compiles successfully and passes TypeScript, but fails during Next.js prerendering of `/_global-error` with `TypeError: Cannot read properties of null (reading 'useContext')`. The same failure occurs under both Turbopack and `next build --webpack`; the stack points to Next internal router context rather than the new notification route. This is unresolved and must be fixed or independently cleared before deploying this change.
