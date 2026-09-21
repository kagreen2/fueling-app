-- ============================================================================
-- Saved Meal Templates
-- Personal reusable meals/recipes with verified macro totals and ingredient notes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description TEXT,
  calories NUMERIC(8,1) NOT NULL CHECK (calories >= 0 AND calories <= 10000),
  protein NUMERIC(8,1) NOT NULL CHECK (protein >= 0 AND protein <= 1000),
  carbs NUMERIC(8,1) NOT NULL CHECK (carbs >= 0 AND carbs <= 1000),
  fat NUMERIC(8,1) NOT NULL CHECK (fat >= 0 AND fat <= 1000),
  meal_type TEXT CHECK (meal_type IS NULL OR meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'corrected_ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_templates_athlete_updated
  ON meal_templates (athlete_id, updated_at DESC);

CREATE OR REPLACE FUNCTION set_meal_template_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_meal_template_updated_at ON meal_templates;
CREATE TRIGGER set_meal_template_updated_at
  BEFORE UPDATE ON meal_templates
  FOR EACH ROW EXECUTE FUNCTION set_meal_template_updated_at();

ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes can manage their own saved meals" ON meal_templates;
CREATE POLICY "Athletes can manage their own saved meals"
  ON meal_templates FOR ALL
  USING (athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid()))
  WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid()));
