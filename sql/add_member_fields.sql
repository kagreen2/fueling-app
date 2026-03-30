-- Add member support fields to athletes table
-- Run this in the Supabase SQL editor

-- Add user_type column (defaults to 'athlete' for backward compatibility)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'athlete';

-- Add activity_level for general members
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS activity_level TEXT;

-- Add training_style for general members
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS training_style TEXT;

-- Add check constraints
ALTER TABLE athletes ADD CONSTRAINT check_user_type 
  CHECK (user_type IN ('athlete', 'member')) NOT VALID;

ALTER TABLE athletes ADD CONSTRAINT check_activity_level 
  CHECK (activity_level IS NULL OR activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')) NOT VALID;

ALTER TABLE athletes ADD CONSTRAINT check_training_style 
  CHECK (training_style IS NULL OR training_style IN ('strength', 'crossfit', 'cardio', 'mixed', 'yoga_pilates')) NOT VALID;

-- Validate constraints (non-blocking)
ALTER TABLE athletes VALIDATE CONSTRAINT check_user_type;
ALTER TABLE athletes VALIDATE CONSTRAINT check_activity_level;
ALTER TABLE athletes VALIDATE CONSTRAINT check_training_style;

-- Index for filtering by user type
CREATE INDEX IF NOT EXISTS idx_athletes_user_type ON athletes(user_type);

-- Also add 'member' as a valid role in profiles (if you use role checks)
-- This is optional if your profiles table doesn't have a role constraint
-- UPDATE: The profiles table role column should accept 'member' as a valid value
