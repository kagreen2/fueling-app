-- ============================================
-- Migration: Add phone number, SMS/email consent, and push subscriptions
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add phone number and consent fields to athletes table
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS sms_email_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_email_consent_date TIMESTAMPTZ;

-- 2. Create push_subscriptions table for Web Push Notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Enable RLS on push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for push_subscriptions
CREATE POLICY "Users can insert their own subscription"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscription"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Note: The service role key (used by the cron job) bypasses RLS by default,
-- so no additional policy is needed for the cron to read all subscriptions.
