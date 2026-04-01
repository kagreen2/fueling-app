# Fuel Different — Feature Backlog

**Last Updated:** April 1, 2026
**Document Owner:** Kelly McGriff-Culver

This document consolidates all planned features, pending fixes, infrastructure tasks, and future ideas for the Fuel Different platform. Items are organized by priority and category, with status tracking for each.

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| **P0 — Critical** | Blocking users or breaking functionality. Fix immediately. |
| **P1 — High** | Significant impact on user experience or coach workflow. Build next. |
| **P2 — Medium** | Valuable improvement, not urgent. Schedule for upcoming sprint. |
| **P3 — Low** | Nice-to-have. Build when capacity allows. |

---

## 1. Pending Infrastructure / Database Tasks

These items require manual action in Supabase or Vercel and cannot be deployed through code alone.

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1.1 | Run pending migration: `invitations` table (see `supabase/migrations/`) | P0 | ⬜ Not Started |
| 1.2 | Run pending migration: `meal_type` column addition | P0 | ⬜ Not Started |
| 1.3 | Verify `RESEND_API_KEY` is set in **Vercel** environment variables (needed for error alert emails and chat notification emails) | P0 | ⬜ Not Started |
| 1.4 | Set up `daily-health-check` Edge Function cron job (function exists but no cron trigger) | P1 | ⬜ Not Started |
| 1.5 | Add DMARC DNS record for `fueldifferent.app` to improve email deliverability | P2 | ⬜ Not Started |
| 1.6 | Redeploy Vercel after updating `RESEND_API_KEY` to activate error/security alert emails | P1 | ⬜ Not Started |

---

## 2. Recently Completed (April 1, 2026)

These items were built and deployed during the current session.

| # | Feature | Status |
|---|---------|--------|
| 2.1 | Daily coach report email — fixed API key and cron trigger, now sending nightly at 11:30 PM CT | ✅ Done |
| 2.2 | Enhanced nightly email — added Meals column, Red Flag Alerts, Action Items (unread messages, pending supplements, new athletes) | ✅ Done |
| 2.3 | Admin dashboard alert "View" button — pending supplements alert now navigates to athlete detail | ✅ Done |
| 2.4 | Check-in error handling — improved error messages with specific diagnostics | ✅ Done |
| 2.5 | Check-in `training_type` enum — converted to text column to support general fitness training types | ✅ Done |
| 2.6 | Check-in RLS policy — fixed `WITH CHECK` clause for athlete inserts | ✅ Done |
| 2.7 | Hydration decrement buttons — athletes can now remove accidentally logged water and electrolytes | ✅ Done |
| 2.8 | Wellness Spotlight component — today's score, 7-day average, trend arrow, sparkline, and contextual insight messages on athlete dashboard, coach overview table, and coach athlete detail page | ✅ Done |
| 2.9 | Chat notification system — message badge in coach header, Messages tab in coach dashboard, email notification when athlete sends a message | ✅ Done |
| 2.10 | "Log Again Today" button on meal history — one-tap re-logging of any past meal to today's date | ✅ Done |
| 2.11 | Recent & Frequent quick-add on meal logging page — shows last 5 unique meals and top 5 most-logged meals for one-tap logging | ✅ Done |

---

## 3. Notification System Enhancements

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 3.1 | Instant wellness red flag email | P1 | ⬜ Not Started | When an athlete submits a check-in with a wellness score below 40, immediately email the coach rather than waiting for the nightly report. |
| 3.2 | Missed check-in nudge to athletes | P2 | ⬜ Not Started | If an athlete hasn't checked in by a configurable time (e.g., 6 PM), send them a push notification or email reminder. |
| 3.3 | New athlete joined notification | P2 | ⬜ Not Started | Instant email to the coach when a new athlete accepts an invitation and creates their account. |
| 3.4 | Payment failure email to admin | P1 | ⬜ Not Started | When a Stripe payment fails, email the admin/super_admin immediately. The webhook handler exists but doesn't send an email. |
| 3.5 | Weekly summary email | P2 | ⬜ Not Started | A more comprehensive weekly digest with trends, averages, streak leaders, and week-over-week comparisons. |
| 3.6 | Goal milestone notifications | P3 | ⬜ Not Started | Celebrate when an athlete hits a streak (7 days, 30 days), reaches a hydration goal, or improves their wellness average. |
| 3.7 | Supplement approval notification | P2 | ⬜ Not Started | Email the athlete when a coach approves or flags a supplement. |
| 3.8 | Enhance nightly email with nutrition compliance | P2 | ⬜ Not Started | Add calorie and protein % vs. target for each athlete in the nightly report. |
| 3.9 | Coach notification preferences | P3 | ⬜ Not Started | Allow coaches to configure which notifications they receive (email, in-app, or both) and set quiet hours. |

---

## 4. Athlete Experience

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 4.1 | Jared and Kelly app tutorial welcome video | P2 | ⬜ Not Started | Record a video walkthrough of the app for new athletes. Replace or supplement the current slideshow tutorial on the onboarding flow. |
| 4.2 | Meal photo upload | P2 | ⬜ Not Started | Allow athletes to take a photo of their meal when logging, giving coaches visual context. |
| 4.3 | Barcode scanner for supplements | P3 | ⬜ Not Started | Scan a supplement barcode to auto-populate the supplement review form. |
| 4.4 | Hydration reminders | P2 | ⬜ Not Started | Configurable push notifications reminding athletes to drink water throughout the day. |
| 4.5 | Check-in streak tracker | P2 | ⬜ Not Started | Visual streak counter on the athlete dashboard showing consecutive check-in days. |
| 4.6 | Personalized recovery recommendations | P3 | ⬜ Not Started | Based on wellness score trends, suggest specific recovery actions (sleep earlier, reduce training volume, increase hydration). |
| 4.7 | Dark mode / light mode toggle | P3 | ⬜ Not Started | Allow athletes to switch between dark and light themes. |
| 4.8 | "My Meals" saved library | P2 | ⬜ Not Started | Personal library where athletes can bookmark favorite meals and re-log them anytime. Includes a dedicated `/athlete/meals/saved` page with search, delete, and one-tap log. Requires new `saved_meals` table + RLS. Save button on meal history cards and after logging. Could integrate as a third section in the Quick Add area. |

---

## 5. Coach Experience

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 5.1 | Bulk messaging | P2 | ⬜ Not Started | Allow coaches to send a message to all athletes on a team at once (e.g., "Great work this week team!"). |
| 5.2 | Coach-to-coach messaging | P3 | ⬜ Not Started | Allow coaches and admins to message each other within the platform. |
| 5.3 | Exportable reports (PDF/CSV) | P2 | ⬜ Not Started | Allow coaches to export athlete data, wellness trends, and nutrition logs as PDF or CSV for sharing with athletic directors or parents. |
| 5.4 | Custom wellness thresholds | P2 | ⬜ Not Started | Let coaches set custom thresholds for red flag alerts (e.g., some coaches may want to flag stress at 6 instead of 7). |
| 5.5 | Meal plan templates | P2 | ⬜ Not Started | Pre-built meal plan templates that coaches can assign to athletes based on their goals and sport. |
| 5.6 | Athlete comparison view | P3 | ⬜ Not Started | Side-by-side comparison of two or more athletes' wellness and nutrition data. |
| 5.7 | Training load integration | P3 | ⬜ Not Started | Track training volume/load alongside wellness to correlate workload with recovery. |

---

## 6. Admin / Platform

| # | Feature | Priority | Status | Description |
|---|---------|----------|--------|-------------|
| 6.1 | Super admin: assign coaches to teams from admin dashboard | P1 | ⬜ Not Started | Full CRUD for team-coach assignments from the admin panel. |
| 6.2 | Super admin: view all users on a team and access their profiles | P1 | ⬜ Not Started | Drill-down from team view to see all members with links to their data. |
| 6.3 | Payment decline alerts on admin dashboard | P1 | ⬜ Not Started | Banner alert on admin dashboard when a payment has failed. |
| 6.4 | User activity audit log | P3 | ⬜ Not Started | Track login times, feature usage, and last active dates for all users. |
| 6.5 | Multi-organization support | P3 | ⬜ Not Started | Support multiple schools/gyms under one platform with isolated data. |
| 6.6 | Role-based feature flags | P3 | ⬜ Not Started | Enable/disable features per organization or subscription tier. |

---

## 7. Technical Debt / Code Quality

| # | Task | Priority | Status | Description |
|---|------|----------|--------|-------------|
| 7.1 | Realtime subscriptions for chat | P1 | ⬜ Not Started | Currently chat requires manual refresh. Add Supabase Realtime subscription so messages appear instantly. |
| 7.2 | Consolidate athlete data loading | P2 | ⬜ Not Started | The coach dashboard makes many separate queries. Consolidate into fewer, more efficient queries or a database view. |
| 7.3 | Error boundary components | P2 | ⬜ Not Started | Add React error boundaries to prevent full-page crashes when a single component fails. |
| 7.4 | Automated testing | P3 | ⬜ Not Started | Add unit tests for wellness score calculations, red flag detection, and critical business logic. |
| 7.5 | Performance optimization | P2 | ⬜ Not Started | Lazy-load dashboard sections, optimize image loading, and reduce initial bundle size. |

---

## How to Use This Document

When starting a new development session, review this backlog and select items to work on based on priority. After completing an item, update its status to ✅ Done and add it to the "Recently Completed" section with the date.

**Status Key:**
- ⬜ Not Started
- 🔄 In Progress
- ✅ Done
- ❌ Blocked (add reason in description)
