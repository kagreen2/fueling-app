-- Invitations table: tracks athlete invitations sent by coaches
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL,  -- The team's invite code, included in the signup link
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups by coach
CREATE INDEX IF NOT EXISTS idx_invitations_coach_id ON invitations(coach_id);

-- Index for checking if an email was already invited
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- RLS policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Coaches can see their own invitations
CREATE POLICY "Coaches can view own invitations"
  ON invitations FOR SELECT
  USING (auth.uid() = coach_id);

-- Coaches can insert invitations for their own teams
CREATE POLICY "Coaches can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- Coaches can update their own invitations (e.g., resend)
CREATE POLICY "Coaches can update own invitations"
  ON invitations FOR UPDATE
  USING (auth.uid() = coach_id);

-- Admins/super_admins can see all invitations
CREATE POLICY "Admins can view all invitations"
  ON invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
