-- Fuel Score v2 Migration
-- 1. Add sleep_quality column to daily_checkins (slider value 1-10)
ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS sleep_quality INTEGER DEFAULT 5;

-- 2. Backfill sleep_quality from existing sleep_hours data
-- Maps: 4hrs→2, 5hrs→3, 6hrs→5, 7hrs→7, 8hrs→8, 9+hrs→10
UPDATE daily_checkins
SET sleep_quality = CASE
  WHEN sleep_hours IS NULL THEN 5
  WHEN sleep_hours <= 4 THEN 2
  WHEN sleep_hours <= 5 THEN 3
  WHEN sleep_hours <= 6 THEN 5
  WHEN sleep_hours <= 7 THEN 7
  WHEN sleep_hours <= 8 THEN 8
  WHEN sleep_hours <= 9 THEN 9
  ELSE 10
END
WHERE sleep_quality IS NULL OR sleep_quality = 5;

-- 3. Drop and recreate coach_wellness_summary view with Fuel Score v2 formula
-- The wellness_score column is the LIVE score (updated by the app to include nutrition).
-- The checkin_only_score is the baseline from check-in inputs only (no nutrition).
DROP VIEW IF EXISTS coach_wellness_summary;

CREATE VIEW coach_wellness_summary AS
SELECT 
  athlete_id,
  date,
  energy,
  stress,
  soreness,
  hydration_status AS hydration,
  sleep_hours,
  sleep_quality,
  hunger,
  training_type,
  -- Live Fuel Score (updated by app when meals are logged, includes nutrition component)
  wellness_score,
  -- Check-in only baseline (no nutrition data)
  round(
    (
      ((COALESCE(sleep_quality, 5) - 1) / 9.0) * 0.235 +
      ((10 - stress) / 9.0) * 0.235 +
      ((energy - 1) / 9.0) * 0.175 +
      ((10 - soreness) / 9.0) * 0.175 +
      ((COALESCE(hydration_status, 5) - 1) / 9.0) * 0.12 +
      ((10 - COALESCE(hunger, 5)) / 9.0) * 0.06
    ) * 100
  ) AS checkin_only_score
FROM daily_checkins dc;
