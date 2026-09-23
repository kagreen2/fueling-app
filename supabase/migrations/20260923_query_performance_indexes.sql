-- ============================================================================
-- Query Performance Indexes
-- Reduces disk reads for the highest-frequency Fuel Different lookups:
-- daily meal/check-in tracking, coach messaging, hydration, and reminders.
-- Safe to run in Supabase SQL Editor. All indexes are additive and idempotent.
-- ============================================================================

-- Meal logging: athlete dashboard, meal history, Meal Assistant, and reminders.
CREATE INDEX IF NOT EXISTS idx_meal_logs_athlete_date_logged_at
  ON meal_logs (athlete_id, date DESC, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_logs_date_athlete
  ON meal_logs (date, athlete_id);

-- Daily check-ins: athlete dashboard/streaks and reminder exclusion checks.
CREATE INDEX IF NOT EXISTS idx_daily_checkins_athlete_date
  ON daily_checkins (athlete_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_date_user
  ON daily_checkins (date, user_id);

-- Hydration dashboard lookup.
CREATE INDEX IF NOT EXISTS idx_hydration_logs_athlete_date
  ON hydration_logs (athlete_id, date);

-- Messaging: conversation loading and unread badges/inbox alerts.
CREATE INDEX IF NOT EXISTS idx_chat_messages_athlete_created
  ON chat_messages (athlete_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_receiver_created
  ON chat_messages (receiver_id, created_at DESC)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created
  ON chat_messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_created
  ON chat_messages (receiver_id, created_at DESC);

-- Refresh planner statistics after the new indexes are available.
ANALYZE meal_logs;
ANALYZE daily_checkins;
ANALYZE hydration_logs;
ANALYZE chat_messages;
