-- Fix ambiguous PL/pgSQL output-variable references in the scheduled-message claim function.
-- This is safe to run after 20260915_scheduled_coach_messages.sql.

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
    FROM scheduled_coach_message_deliveries AS d
    JOIN scheduled_coach_messages AS sm ON sm.id = d.scheduled_message_id
    WHERE d.status = 'pending'
    ORDER BY d.created_at
    FOR UPDATE OF d SKIP LOCKED
    LIMIT safe_limit
  ),
  due_schedules AS (
    SELECT sm.id, sm.recurrence, sm.next_send_at
    FROM scheduled_coach_messages AS sm
    WHERE sm.status = 'scheduled'
      AND sm.next_send_at <= now()
    ORDER BY sm.next_send_at
    FOR UPDATE SKIP LOCKED
    LIMIT safe_limit
  ),
  created_deliveries AS (
    INSERT INTO scheduled_coach_message_deliveries AS new_delivery (
      scheduled_message_id,
      athlete_id,
      recipient_profile_id,
      occurrence_at
    )
    SELECT ds.id,
           r.athlete_id,
           r.recipient_profile_id,
           ds.next_send_at
    FROM due_schedules AS ds
    JOIN scheduled_coach_message_recipients AS r ON r.scheduled_message_id = ds.id
    ON CONFLICT DO NOTHING
    RETURNING new_delivery.id,
              new_delivery.scheduled_message_id,
              new_delivery.athlete_id,
              new_delivery.recipient_profile_id,
              new_delivery.occurrence_at,
              new_delivery.attempt_count
  ),
  advanced_schedules AS (
    UPDATE scheduled_coach_messages AS sm
    SET next_send_at = CASE
          WHEN ds.recurrence = 'weekly' THEN ds.next_send_at + interval '7 days'
          ELSE sm.next_send_at
        END,
        status = CASE WHEN ds.recurrence = 'once' THEN 'completed' ELSE sm.status END,
        completed_at = CASE WHEN ds.recurrence = 'once' THEN now() ELSE sm.completed_at END
    FROM due_schedules AS ds
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
  FROM retry_deliveries AS rd
  UNION ALL
  SELECT cd.id,
         cd.scheduled_message_id,
         cd.athlete_id,
         cd.recipient_profile_id,
         sm.coach_id,
         sm.message,
         cd.occurrence_at,
         cd.attempt_count
  FROM created_deliveries AS cd
  JOIN scheduled_coach_messages AS sm ON sm.id = cd.scheduled_message_id
  LIMIT safe_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_due_scheduled_coach_message_deliveries(INTEGER) TO service_role;
