# Bug Fixes and Diagnostics — April 2026

**Fuel Different App**
**Date:** April 1, 2026

---

## Summary of Changes Made

This document covers the investigation and fixes for 5 reported issues plus 1 feature request. Three code fixes have been committed and pushed to GitHub (auto-deploys to Vercel). The remaining issues require database or infrastructure actions in Supabase that must be done manually.

---

## 1. Daily Coach Recap Emails Not Firing

**Status:** Requires manual setup in Supabase

**Root Cause:** The Edge Function code (`supabase/functions/daily-coach-report/index.ts`) is written and ready, but it needs to be **deployed** and a **cron trigger** needs to be set up. The function will not fire on its own without these steps.

### What You Need to Do

**Step A — Set the Resend API Key in Supabase Edge Function Secrets:**

1. Go to your **Supabase Dashboard**
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add: `RESEND_API_KEY` = your Resend API key (starts with `re_`)

**Step B — Deploy the Edge Function:**

From your terminal (with Supabase CLI installed):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy daily-coach-report
```

**Step C — Set Up the Cron Trigger:**

1. Go to **Supabase Dashboard** → **Database** → **Extensions**
2. Enable `pg_cron` and `pg_net` if not already enabled
3. Go to **SQL Editor** and run:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'daily-coach-report',
  '30 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-coach-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

This schedules the report at **4:30 AM UTC = 11:30 PM CT** (during CDT).

**Step D — Test It Manually:**

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-coach-report \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

## 2. Error/Security Alert Emails Not Arriving

**Status:** Requires Vercel environment variable verification

**Root Cause:** The error report API (`/api/error-report`) checks for `process.env.RESEND_API_KEY`. If this variable is not set in Vercel, critical error emails will silently fail (the error is still logged to Vercel console).

### What You Need to Do

1. Go to **Vercel Dashboard** → your project → **Settings** → **Environment Variables**
2. Verify `RESEND_API_KEY` is set for **Production** environment
3. Also verify `ADMIN_EMAIL` is set to `kelly@crossfitironflag.com` (or it defaults to this)

### Additional Check — Resend Domain Verification

The emails are sent from `notifications@fueldifferent.app` and `reports@fueldifferent.app`. For these to work:

1. Go to **Resend Dashboard** → **Domains**
2. Verify that `fueldifferent.app` is listed and **verified** (green checkmark)
3. If not verified, add the domain and follow the DNS record instructions

You can test the email service by hitting the health endpoint: `https://www.fueldifferent.app/api/health` — it checks Resend connectivity and will report if the API key is missing or invalid.

---

## 3. Admin Dashboard Alert Banner "View" Button

**Status:** Fixed and deployed

**What Was Wrong:** The "pending supplements" notification in the coach dashboard was missing an `action` property, so no "View" button appeared for it. The other alerts (missed check-ins, high stress) already had working View buttons.

**What Was Fixed:** Added an `action` to the pending supplements alert that navigates directly to the first athlete who has a pending supplement review. If no specific athlete is found, it falls back to the Alerts tab.

**File Changed:** `app/coach/dashboard/page.tsx`

---

## 4. Chat Messages Not Visible to Coaches

**Status:** Requires database table creation

**Root Cause:** The `chat_messages` table may not exist in your Supabase database yet. The SQL file exists at `sql/chat_messages_table.sql` but needs to be run manually.

### What You Need to Do

Run this SQL in the **Supabase SQL Editor**:

```sql
-- Chat Messages table for coach-athlete/member messaging
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_athlete_id ON chat_messages(athlete_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- RLS policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages where they are sender or receiver
CREATE POLICY "Users can read own messages" ON chat_messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (for marking as read)
CREATE POLICY "Users can mark received messages as read" ON chat_messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Coaches and admins can also read messages for athletes they manage
CREATE POLICY "Coaches can read athlete messages" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin', 'super_admin')
    )
  );
```

### If the Table Already Exists

If the table exists but coaches still cannot see messages, the issue is likely the RLS policy. Check if the "Coaches can read athlete messages" policy exists:

```sql
SELECT * FROM pg_policies WHERE tablename = 'chat_messages';
```

If the coach policy is missing, add it:

```sql
CREATE POLICY "Coaches can read athlete messages" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin', 'super_admin')
    )
  );
```

---

## 5. Check-in Save Error for New Accounts

**Status:** Improved error handling deployed; root cause requires investigation

**What Was Fixed:**
- The check-in page now shows **specific error messages** instead of a generic "Failed to save check-in" message. This will help identify the exact cause:
  - **Permission error (42501):** RLS policy blocking the insert
  - **Foreign key error (23503):** Athlete record doesn't exist or isn't linked properly
  - **Constraint error (23514):** Invalid data value (e.g., training_type constraint)
  - **Other errors:** Shows the actual error message from Supabase
- Check-in errors are now **automatically reported** to the `/api/error-report` endpoint for monitoring
- If no athlete profile is found, shows a helpful message directing the user to complete onboarding

**File Changed:** `app/athlete/checkin/page.tsx`

### Likely Root Causes (in order of probability)

1. **RLS Policy Issue:** The `daily_checkins` table may not have an INSERT policy that allows athletes to insert their own records. Check with:

```sql
SELECT * FROM pg_policies WHERE tablename = 'daily_checkins';
```

If there's no INSERT policy for athletes, add one:

```sql
CREATE POLICY "Athletes can insert own checkins" ON daily_checkins
  FOR INSERT
  WITH CHECK (
    athlete_id IN (
      SELECT id FROM athletes WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can update own checkins" ON daily_checkins
  FOR UPDATE
  USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can read own checkins" ON daily_checkins
  FOR SELECT
  USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE profile_id = auth.uid()
    )
  );
```

2. **Missing Athlete Record:** The user signed up but never completed onboarding, so no row exists in the `athletes` table. The improved error message will now clearly indicate this.

3. **Training Type Constraint:** If the `training_style` constraint on the `athletes` table is still set to single values only, multi-select training styles (comma-separated) will fail. To fix:

```sql
ALTER TABLE athletes DROP CONSTRAINT IF EXISTS check_training_style;
```

---

## 6. Water/Electrolyte Decrement Buttons (Feature Request)

**Status:** Implemented and deployed

**What Was Added:**
- **Water section:** Added "Remove" row with -8oz, -16oz, -20oz, -32oz buttons (red-tinted)
- **Electrolytes section:** Added "Remove" row with -8oz, -12oz, -16oz, -20oz buttons (red-tinted)
- Buttons are **disabled** (grayed out) when the current total is less than the decrement amount, preventing negative values
- Values cannot go below 0

**File Changed:** `app/athlete/hydration/page.tsx`

---

## Pending Database Migrations (Reminder)

These two migrations from the previous session still need to be run:

### Migration 1: Invitations Table

```sql
-- File: supabase/migrations/20260331_create_invitations.sql
-- Run in Supabase SQL Editor
```

(Full SQL is in the file — creates the `invitations` table with RLS policies for the coach invitation system)

### Migration 2: Meal Type Column

```sql
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS meal_type text;

ALTER TABLE meal_logs ADD CONSTRAINT check_meal_type 
  CHECK (meal_type IS NULL OR meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'));

CREATE INDEX IF NOT EXISTS idx_meal_logs_meal_type ON meal_logs(meal_type);
```

---

## Quick Reference: Action Items for Kelly

| # | Action | Where | Priority |
|---|--------|-------|----------|
| 1 | Verify `RESEND_API_KEY` in Vercel env vars | Vercel Dashboard → Settings → Env Vars | High |
| 2 | Verify `fueldifferent.app` domain in Resend | Resend Dashboard → Domains | High |
| 3 | Set `RESEND_API_KEY` in Supabase Edge Function secrets | Supabase → Project Settings → Edge Functions → Secrets | High |
| 4 | Deploy `daily-coach-report` Edge Function | Terminal: `supabase functions deploy daily-coach-report` | High |
| 5 | Set up pg_cron trigger for daily report | Supabase SQL Editor (see Section 1) | High |
| 6 | Run `chat_messages` table SQL (if not already done) | Supabase SQL Editor (see Section 4) | High |
| 7 | Check `daily_checkins` RLS policies | Supabase SQL Editor (see Section 5) | Medium |
| 8 | Run invitations table migration | Supabase SQL Editor | Medium |
| 9 | Run meal_type column migration | Supabase SQL Editor | Medium |
| 10 | Drop `check_training_style` constraint (if still exists) | Supabase SQL Editor | Low |

---

## Files Changed in This Update

| File | Changes |
|------|---------|
| `app/coach/dashboard/page.tsx` | Added action to pending_supplements alert View button |
| `app/athlete/checkin/page.tsx` | Improved error handling with specific messages + error reporting |
| `app/athlete/hydration/page.tsx` | Added minus/decrement buttons for water and electrolytes |
