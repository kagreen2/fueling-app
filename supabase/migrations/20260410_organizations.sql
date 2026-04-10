-- ============================================================
-- Organizations table for white-label / multi-tenant support
-- Each organization represents a school, gym, or company
-- that gets their own branding applied across the platform.
-- ============================================================

-- 1. Create the organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- Display name: "Lincoln High School"
  slug TEXT NOT NULL UNIQUE,                   -- Subdomain slug: "lincolnhigh" → lincolnhigh.fueldifferent.com
  
  -- Branding
  logo_url TEXT,                               -- URL to the org's logo (uploaded to storage)
  icon_url TEXT,                               -- URL to a small icon/favicon (optional)
  primary_color TEXT NOT NULL DEFAULT '#9333EA', -- Primary brand color (buttons, active states) — default: purple
  accent_color TEXT NOT NULL DEFAULT '#22C55E',  -- Accent color (highlights, badges) — default: green
  background_color TEXT DEFAULT '#0F172A',      -- Background color — default: slate-900
  
  -- Contact / metadata
  contact_email TEXT,                          -- Admin contact email for the org
  sport TEXT,                                  -- Primary sport: "Football", "CrossFit", etc.
  website TEXT,                                -- Org's external website
  
  -- Feature flags
  custom_email_from TEXT,                      -- Custom "from" name for emails: "Tiger Fuel <reports@fueldifferent.app>"
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add org_id to teams table (nullable — existing teams have no org yet)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 3. Add org_id to profiles table (for direct org membership, e.g. coaches)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 4. Create index for subdomain lookups (most common query path)
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON teams(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);

-- 5. Insert the default "Fuel Different" organization
INSERT INTO organizations (name, slug, primary_color, accent_color, background_color, contact_email, custom_email_from)
VALUES (
  'Fuel Different',
  'default',
  '#9333EA',
  '#22C55E',
  '#0F172A',
  'kelly@crossfitironflag.com',
  'Fuel Different'
)
ON CONFLICT (slug) DO NOTHING;

-- 6. RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Everyone can read organizations (needed for subdomain lookup on login page)
CREATE POLICY "Anyone can read organizations"
  ON organizations FOR SELECT
  USING (true);

-- Only super_admins can insert/update/delete organizations
CREATE POLICY "Super admins can manage organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- 8. Create a storage bucket for org logos (if not exists)
-- Note: Run this in Supabase dashboard or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true);
