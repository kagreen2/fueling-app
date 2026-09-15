# Coach-Side Scheduled Messages — Assessment

**Prepared:** September 15, 2026

## Current foundations

Fuel Different already has the core components required for a reliable in-app scheduled messaging feature:

- Coach messages are stored as `chat_messages` with a sender, recipient, athlete, content, read state, and creation time.
- The coach chat sends instant messages today through `ChatPanel`.
- The athlete push-notification endpoint (`/api/chat/notify-athlete`) produces a neutral alert without exposing message content.
- The deployed Vercel project already runs secured cron routes four times daily and verifies `CRON_SECRET`.
- No scheduled-message table, queue, edit/cancel UI, or delivery log exists today.

## Option A — Coach message scheduler inside Fuel Different (recommended durable product)

Create a coach-facing **Scheduled Messages** area linked from the existing chat or coach dashboard. Coaches can draft one message, select one athlete or a filtered group, choose a date/time in Central Time, and optionally make it repeat weekly. The app stores the message as scheduled; the existing protected cron route checks for due messages, writes each delivery into `chat_messages`, marks it sent, and triggers the existing neutral push notification.

### Required controls

1. One-time and weekly recurring schedules.
2. Recipient selection: one athlete, a coach’s roster, or a selected challenge group.
3. Draft, scheduled, sent, failed, canceled, and paused states.
4. Edit or cancel before a message sends; automatic duplicate protection using a delivery record.
5. Central Time display and a delivery history with the actual send timestamp.
6. Notification behavior identical to a live coach message: no preview of sensitive content in the push alert.

### Data model

- `scheduled_coach_messages`: template content, owner, target definition, recurrence rule, next send time, timezone, status, and lifecycle timestamps.
- `scheduled_coach_message_deliveries`: one immutable record per athlete per scheduled occurrence, including delivered `chat_message_id`, outcome, and error reason if any.

## Option B — Reminder templates only (lighter first release)

Add a small library of reusable coach templates such as “Wednesday office-hours reminder,” “weekly check-in,” or “final scan reminder.” A coach can select a template and send it immediately to selected athletes, but the app would not automatically deliver it later.

This is faster to build and reduces configuration complexity, but it does not solve the core need of scheduling the message and walking away.

## Delivery options after Vercel plan review

The deployed Fuel Different Vercel project is currently on the **Hobby** plan. Vercel documents that Hobby cron jobs may run only once per day, so the current Vercel configuration cannot reliably deliver coach-selected messages at arbitrary times during the day.

| Delivery approach | What it enables | Tradeoffs | Cost / setup |
| --- | --- | --- | --- |
| Upgrade Vercel to Pro | Poll and deliver due messages on a short interval, providing a simple implementation and near-real-time delivery. | Adds an ongoing Vercel plan cost. | Current Vercel pricing lists Pro from $20/month per user; light technical setup after upgrade. |
| Use Supabase Cron with a secure database-to-app delivery call | Process due messages every few minutes without changing the Vercel plan. Supabase stores the job schedule, triggers a secure delivery endpoint, and maintains run history. | Requires a one-time secure secret setup between Supabase and the app, plus monitoring in Supabase. | No separate Vercel upgrade; moderate one-time implementation. Existing Supabase plan limits still apply. |

## Recommended durable product

The planned coach interface is the same in either option: a **Scheduled Messages** area linked from the coach dashboard. Coaches can draft one message, select one athlete or a filtered group, choose a date/time in Central Time, and optionally make it repeat weekly. The app stores the message as scheduled; the selected background delivery method checks for due messages, writes each delivery into `chat_messages`, marks it sent, and triggers the existing neutral push notification.

The delivery table makes repeated job calls safe: each athlete gets each scheduled occurrence once, even if a job retries.

## Guardrails

- Scheduled messages should be generated only from authenticated coach/admin accounts and must respect the athlete’s assigned-coach or admin fallback relationship.
- Deleting or pausing a schedule must never remove messages already delivered.
- Athlete subscription/push-permission status should not prevent the in-app message itself; it only affects whether a phone/browser alert is received.
- Time-zone labels should always say **Central Time** in the coach interface.

## Deployment evidence

The project’s `vercel.json` already schedules `/api/cron/send-reminders` four times daily. Vercel’s cron guidance confirms that a Next.js route handler can verify `CRON_SECRET`, and that several schedules may invoke the same API path; however, the project’s current Hobby plan limits cron jobs to once daily. Supabase documents that `pg_cron` can run recurring database jobs and, together with `pg_net`, securely invoke an Edge Function or remote HTTPS endpoint on a frequent schedule.

## Sources

1. [Vercel — Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
2. [Vercel — Usage & Pricing for Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing)
3. [Supabase — Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
4. [Supabase — Cron](https://supabase.com/docs/guides/cron)
