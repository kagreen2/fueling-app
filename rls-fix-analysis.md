# RLS Policy Analysis

## Root Cause Found

The `athletes` table has a policy "Coaches can view team athletes" that queries `team_members` joined with `teams`:
```sql
EXISTS (
  SELECT 1 FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.athlete_id = athletes.id AND t.coach_id = auth.uid()
)
```

When the admin page loads athletes, this policy fires. But the `team_members` table also has policies that check back against other tables. This creates a cross-table RLS evaluation chain that can cause issues.

The immediate problem: The "Admins can view all athletes" SELECT policy should work for super_admin. But the `athletes_own_data` ALL policy with `profile_id = auth.uid()` might be interfering — since the admin's profile_id doesn't match any athlete's profile_id, and ALL policies can override SELECT policies.

## The Fix
The `athletes_own_data` ALL policy is too broad — it applies to ALL operations but only matches the athlete themselves. For admin users, none of the ALL policies match, and PostgreSQL RLS requires at least one policy to match for each operation type.

Actually wait — PostgreSQL RLS is permissive by default, meaning ANY matching policy grants access. So the admin SELECT policy should work independently.

Let me check if the issue is that `athletes_own_data` ALL policy is RESTRICTIVE instead of PERMISSIVE.
