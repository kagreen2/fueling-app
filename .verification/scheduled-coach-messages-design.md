# Scheduled Coach Messages — Approved Database-Backed Design

**Decision:** Store schedules and recipient snapshots in Supabase. Use Supabase Cron and `pg_net` to invoke the deployed Fuel Different delivery route every five minutes. The delivery route creates the actual in-app `chat_messages` record and invokes the existing neutral push-notification helper.

## User-facing behavior

Coaches and admins can open **Scheduled Messages**, choose one or more athletes or one entire team, write a message, select a Central Time date/time, and choose one-time or weekly delivery. The list shows each message as Scheduled, Paused, Completed, or Canceled. Upcoming messages can be edited, paused, resumed, or canceled before delivery.

## Safety and privacy behavior

- Recipient lists are captured at scheduling time, so a team roster change does not silently expand or change a planned send.
- Scheduled messages create ordinary `chat_messages`; they appear in the athlete’s chat and preserve unread state like a live coach message.
- The athlete’s push alert remains neutral: “New message from your coach” and “You have a new message in Fuel Different.” The scheduled content never appears in a phone/browser notification.
- The delivery table has a unique occurrence key per schedule, athlete, and send time. This prevents duplicate delivery when jobs retry or overlap.
- Coaches may schedule only athletes in their teams or directly assigned roster. Admins may schedule any athlete.
- All timestamps are stored as UTC (`timestamptz`). The coach UI accepts and labels input as America/Chicago.

## Tables

| Table | Purpose |
| --- | --- |
| `scheduled_coach_messages` | The coach-authored message, schedule, recurrence, lifecycle state, and next UTC send time. |
| `scheduled_coach_message_recipients` | Snapshot of athletes selected for the scheduled message. |
| `scheduled_coach_message_deliveries` | Durable, idempotent per-athlete send attempts and the resulting real chat-message ID. |

## Delivery lifecycle

1. Supabase Cron invokes the protected Fuel Different route every five minutes.
2. The route calls a database function that atomically claims due schedule occurrences and creates delivery rows.
3. The route writes a real chat message for every claimed recipient and records its `chat_message_id`.
4. The route requests the same neutral push alert used for live coach messages. Push failure does not remove the in-app chat message.
5. The route marks one-time schedules completed after their recipient deliveries are finalized; weekly schedules advance by one week.

## Manual production activation required

Code and SQL prepare the feature, but a database-backed scheduler requires a one-time production activation after deployment:

1. Run the migration file in the Supabase SQL Editor.
2. Store the deployed app URL and the existing Vercel `CRON_SECRET` in Supabase Vault.
3. Enable the supplied Supabase Cron job.

The SQL migration keeps the cron job disabled until these values exist, preventing unauthenticated external delivery calls.
