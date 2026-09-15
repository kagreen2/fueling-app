-- ============================================================================
-- Scheduled Coach Messages
-- Database-backed scheduling with recipient snapshots and idempotent delivery.
-- Run this migration before deploying the accompanying application code.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scheduled_coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 2000),
  audience_type TEXT NOT NULL CHECK (audience_type IN ('athletes', 'team')),
  audience_label TEXT,
  recurrence TEXT NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once', 'weekly')),
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  scheduled_for TIMESTAMPTZ NOT NULL,
  next_send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paused', 'completed', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scheduled_coach_messages_due
  ON scheduled_coach_messages (status, next_send_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_scheduled_coach_messages_coach
  ON scheduled_coach_messages (coach_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_coach_message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_message_id UUID NOT NULL REFERENCES scheduled_coach_messages(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  recipient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scheduled_message_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_coach_message_recipients_schedule
  ON scheduled_coach_message_recipients (scheduled_message_id);

CREATE TABLE IF NOT EXISTS scheduled_coach_message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_message_id UUID NOT NULL REFERENCES scheduled_coach_messages(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  recipient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  occurrence_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  chat_message_id UUID,
  push_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scheduled_message_id, athlete_id, occurrence_at)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_coach_message_deliveries_pending
  ON scheduled_coach_message_deliveries (status, created_at)
  WHERE status = 'pending';

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS scheduled_delivery_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_scheduled_delivery_id
  ON chat_messages (scheduled_delivery_id)
  WHERE scheduled_delivery_id IS NOT NULL;

ALTER TABLE scheduled_coach_message_deliveries
  DROP CONSTRAINT IF EXISTS scheduled_coach_message_deliveries_chat_message_id_fkey;
ALTER TABLE scheduled_coach_message_deliveries
  ADD CONSTRAINT scheduled_coach_message_deliveries_chat_message_id_fkey
  FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;

-- Keep lifecycle timestamps consistent for coach edits, pauses, cancellations, and completion.
CREATE OR REPLACE FUNCTION set_scheduled_coach_message_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_scheduled_coach_message_updated_at ON scheduled_coach_messages;
CREATE TRIGGER set_scheduled_coach_message_updated_at
  BEFORE UPDATE ON scheduled_coach_messages
  FOR EACH ROW EXECUTE FUNCTION set_scheduled_coach_message_updated_at();

CREATE OR REPLACE FUNCTION set_scheduled_coach_message_delivery_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_scheduled_coach_message_delivery_updated_at ON scheduled_coach_message_deliveries;
CREATE TRIGGER set_scheduled_coach_message_delivery_updated_at
  BEFORE UPDATE ON scheduled_coach_message_deliveries
  FOR EACH ROW EXECUTE FUNCTION set_scheduled_coach_message_delivery_updated_at();

ALTER TABLE scheduled_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_coach_message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_coach_message_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage owned scheduled messages" ON scheduled_coach_messages;
CREATE POLICY "Staff can manage owned scheduled messages"
  ON scheduled_coach_messages FOR ALL
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Staff can view scheduled message recipients" ON scheduled_coach_message_recipients;
CREATE POLICY "Staff can view scheduled message recipients"
  ON scheduled_coach_message_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_coach_messages sm
      WHERE sm.id = scheduled_message_id
        AND (
          sm.coach_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
        )
    )
  );

DROP POLICY IF EXISTS "Staff can view scheduled message deliveries" ON scheduled_coach_message_deliveries;
CREATE POLICY "Staff can view scheduled message deliveries"
  ON scheduled_coach_message_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_coach_messages sm
      WHERE sm.id = scheduled_message_id
        AND (
          sm.coach_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
        )
    )
  );

-- Claim pending retries first, then atomically create new deliveries for schedules due now.
-- One-time schedules are marked completed immediately after their delivery rows are created;
-- pending rows remain eligible for retry until a real chat message has been written.
CREATE OR REPLACE FUNCTION claim_due_scheduled_coach_message_deliveries(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  delivery_id UUID,
  scheduled_message_id UUID,
  athlete_id UUID,
  recipient_profile_id UUID,
  coach_id UUID,
  message TEXT,
  occurrence_at TIMESTAMPTZ,
  attempt_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_limit INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 100), 250));
BEGIN
  RETURN QUERY
  WITH retry_deliveries AS (
    SELECT d.id AS delivery_id,
           d.scheduled_message_id,
           d.athlete_id,
           d.recipient_profile_id,
           sm.coach_id,
           sm.message,
           d.occurrence_at,
           d.attempt_count
    FROM scheduled_coach_message_deliveries d
    JOIN scheduled_coach_messages sm ON sm.id = d.scheduled_message_id
    WHERE d.status = 'pending'
    ORDER BY d.created_at
    FOR UPDATE OF d SKIP LOCKED
    LIMIT safe_limit
  ),
  due_schedules AS (
    SELECT sm.id, sm.recurrence, sm.next_send_at
    FROM scheduled_coach_messages sm
    WHERE sm.status = 'scheduled'
      AND sm.next_send_at <= now()
    ORDER BY sm.next_send_at
    FOR UPDATE SKIP LOCKED
    LIMIT safe_limit
  ),
  created_deliveries AS (
    INSERT INTO scheduled_coach_message_deliveries (
      scheduled_message_id,
      athlete_id,
      recipient_profile_id,
      occurrence_at
    )
    SELECT ds.id,
           r.athlete_id,
           r.recipient_profile_id,
           ds.next_send_at
    FROM due_schedules ds
    JOIN scheduled_coach_message_recipients r ON r.scheduled_message_id = ds.id
    ON CONFLICT (scheduled_message_id, athlete_id, occurrence_at) DO NOTHING
    RETURNING id, scheduled_message_id, athlete_id, recipient_profile_id, occurrence_at, attempt_count
  ),
  advanced_schedules AS (
    UPDATE scheduled_coach_messages sm
    SET next_send_at = CASE
          WHEN ds.recurrence = 'weekly' THEN ds.next_send_at + interval '7 days'
          ELSE sm.next_send_at
        END,
        status = CASE WHEN ds.recurrence = 'once' THEN 'completed' ELSE sm.status END,
        completed_at = CASE WHEN ds.recurrence = 'once' THEN now() ELSE sm.completed_at END
    FROM due_schedules ds
    WHERE sm.id = ds.id
    RETURNING sm.id
  )
  SELECT rd.delivery_id,
         rd.scheduled_message_id,
         rd.athlete_id,
         rd.recipient_profile_id,
         rd.coach_id,
         rd.message,
         rd.occurrence_at,
         rd.attempt_count
  FROM retry_deliveries rd
  UNION ALL
  SELECT cd.id,
         cd.scheduled_message_id,
         cd.athlete_id,
         cd.recipient_profile_id,
         sm.coach_id,
         sm.message,
         cd.occurrence_at,
         cd.attempt_count
  FROM created_deliveries cd
  JOIN scheduled_coach_messages sm ON sm.id = cd.scheduled_message_id
  LIMIT safe_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_due_scheduled_coach_message_deliveries(INTEGER) TO service_role;

-- Run these one-time activation steps in Supabase SQL Editor AFTER the application is deployed.
-- Use the actual production app URL and the existing Vercel CRON_SECRET; never place either value in source control.
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- SELECT vault.create_secret('https://app.fueldifferent.app', 'scheduled_message_app_url');
-- SELECT vault.create_secret('YOUR_EXISTING_VERCEL_CRON_SECRET', 'scheduled_message_delivery_secret');
-- SELECT cron.schedule(
--   'fuel-different-scheduled-coach-messages',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduled_message_app_url') || '/api/cron/scheduled-coach-messages',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduled_message_delivery_secret')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
