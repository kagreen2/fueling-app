-- Add meal_type column to meal_logs table
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS meal_type text;

-- Add check constraint for valid meal types
ALTER TABLE meal_logs ADD CONSTRAINT check_meal_type 
  CHECK (meal_type IS NULL OR meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'));

-- Add index for querying meals by type
CREATE INDEX IF NOT EXISTS idx_meal_logs_meal_type ON meal_logs(meal_type);
