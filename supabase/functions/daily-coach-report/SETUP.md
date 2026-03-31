# Daily Coach Report — Setup Guide

This Edge Function sends a nightly email to each coach summarizing their team's daily check-in status, wellness scores, notes, and team compliance percentage.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Resend account with verified domain (`fueldifferent.app`)
- Resend API key

## Step 1: Set Environment Variables in Supabase

Go to your Supabase dashboard → **Project Settings** → **Edge Functions** → **Secrets**, and add:

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

## Step 2: Deploy the Edge Function

From the project root:

```bash
supabase functions deploy daily-coach-report --project-ref YOUR_PROJECT_REF
```

Or if you're logged in via `supabase link`:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy daily-coach-report
```

## Step 3: Set Up the Cron Trigger

11:30 PM CT = 04:30 UTC (during CDT) or 05:30 UTC (during CST).

Go to **Supabase Dashboard** → **Database** → **Extensions** and enable `pg_cron` if not already enabled.

Then run this SQL in the SQL Editor:

```sql
-- Enable pg_cron and pg_net extensions (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the daily report at 11:30 PM CT (04:30 UTC during CDT)
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

**Important:** Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID.

### Alternative: Use Supabase Dashboard Cron

If you prefer the UI approach:
1. Go to **Supabase Dashboard** → **Database** → **Cron Jobs**
2. Click **Create a new cron job**
3. Name: `daily-coach-report`
4. Schedule: `30 4 * * *` (4:30 AM UTC = 11:30 PM CT)
5. Command: HTTP request to your Edge Function URL

## Step 4: Test the Function

You can manually trigger the function to test:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-coach-report \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## What the Email Contains

- **Team Compliance %** — percentage of athletes who checked in today
- **Checked In** — list of athletes with their wellness score (0-100), label (Thriving/Okay/Watch/Concern), and any notes they left
- **Missed Check-in** — list of athletes who didn't check in
- **Link to Dashboard** — direct link to the coach dashboard

## Adjusting the Schedule

To change the time, update the cron expression:

```sql
SELECT cron.unschedule('daily-coach-report');
SELECT cron.schedule(
  'daily-coach-report',
  '30 5 * * *',  -- 5:30 AM UTC = 11:30 PM CST (winter)
  $$ ... same body ... $$
);
```

Note: CDT (summer) is UTC-5, CST (winter) is UTC-6. You may want to adjust twice a year or pick a compromise time.
