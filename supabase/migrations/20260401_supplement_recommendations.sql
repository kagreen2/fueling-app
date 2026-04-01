-- ============================================================
-- Supplement Recommendations System
-- Coach-initiated supplement suggestions with Thorne integration
-- ============================================================

-- 1. Supplement Library (curated catalog of products)
CREATE TABLE IF NOT EXISTS supplement_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Thorne',
  category TEXT NOT NULL,
  default_description TEXT,
  thorne_product_url TEXT,
  nsf_certified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Supplement Recommendations (coach → athlete or team)
CREATE TABLE IF NOT EXISTS supplement_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplement_library_id UUID REFERENCES supplement_library(id) ON DELETE SET NULL,
  custom_name TEXT, -- for non-library supplements
  coach_id UUID NOT NULL REFERENCES profiles(id),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  coach_note TEXT,
  priority TEXT NOT NULL DEFAULT 'recommended' CHECK (priority IN ('essential', 'recommended', 'optional')),
  timing TEXT, -- e.g. "Take with breakfast", "Post-workout"
  thorne_product_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Must have either athlete_id or team_id
  CONSTRAINT rec_target CHECK (athlete_id IS NOT NULL OR team_id IS NOT NULL)
);

-- 3. Athlete Supplement Status (athlete response to recommendations)
CREATE TABLE IF NOT EXISTS athlete_supplement_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID NOT NULL REFERENCES supplement_recommendations(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  is_taking BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recommendation_id, athlete_id)
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE supplement_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_supplement_status ENABLE ROW LEVEL SECURITY;

-- Supplement Library: everyone can read
CREATE POLICY "Anyone can read supplement library"
  ON supplement_library FOR SELECT
  USING (true);

-- Supplement Library: only coaches/admins can insert/update
CREATE POLICY "Coaches can manage supplement library"
  ON supplement_library FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin', 'super_admin')
    )
  );

-- Recommendations: coaches can manage their own
CREATE POLICY "Coaches can manage their recommendations"
  ON supplement_recommendations FOR ALL
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Recommendations: athletes can read their own (direct or via team)
CREATE POLICY "Athletes can read their recommendations"
  ON supplement_recommendations FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    OR team_id IN (
      SELECT team_id FROM team_members WHERE athlete_id IN (
        SELECT id FROM athletes WHERE profile_id = auth.uid()
      )
    )
  );

-- Athlete Supplement Status: athletes can manage their own
CREATE POLICY "Athletes can manage their supplement status"
  ON athlete_supplement_status FOR ALL
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Athlete Supplement Status: coaches can read their athletes' status
CREATE POLICY "Coaches can read athlete supplement status"
  ON athlete_supplement_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin', 'super_admin')
    )
  );

-- ============================================================
-- Seed Supplement Library with Thorne products
-- ============================================================

INSERT INTO supplement_library (name, brand, category, default_description, thorne_product_url, nsf_certified) VALUES
  -- Sports Performance
  ('Creatine', 'Thorne', 'Sports Performance', 'Supports lean muscle mass, endurance, cellular energy, and brain function. One of the most researched performance supplements available.', 'https://www.thorne.com/products/dp/creatine', true),
  ('Amino Complex', 'Thorne', 'Sports Performance', 'Clinically validated EAA and BCAA formula that supports muscle protein synthesis, recovery, and training adaptation.', 'https://www.thorne.com/products/dp/amino-complex-lemon', true),
  ('Beta Alanine-SR', 'Thorne', 'Sports Performance', 'Sustained-release beta-alanine that supports muscle endurance and delays fatigue during high-intensity training.', 'https://www.thorne.com/products/dp/beta-alanine-sr', true),
  ('L-Glutamine Powder', 'Thorne', 'Recovery', 'Amino acid that promotes post-exercise muscle cell repair and supports gastrointestinal health and immune function.', 'https://www.thorne.com/products/dp/l-glutamine-powder', true),
  ('Whey Protein Isolate', 'Thorne', 'Protein', '21 grams of bioavailable protein per serving with flavors and sweeteners derived from natural sources. NSF Certified for Sport.', 'https://www.thorne.com/products/dp/whey-protein-isolate-chocolate', false),

  -- Foundational / Daily
  ('Basic Nutrients 2/Day', 'Thorne', 'Multivitamin', 'A comprehensive daily multivitamin with key nutrients to keep your body healthy and thriving. NSF Certified for Sport.', 'https://www.thorne.com/products/dp/basic-nutrients-2-day-nsf', true),
  ('Multi-Vitamin Elite', 'Thorne', 'Multivitamin', 'Two high-performance formulas that deliver synergistic nutritional support from morning to night.', 'https://www.thorne.com/products/dp/multi-vitamin-elite-nsf', true),
  ('Vitamin D-5,000', 'Thorne', 'Vitamins', 'Supports healthy teeth, bones, and muscles, as well as cardiovascular and immune function. Essential for athletes training indoors.', 'https://www.thorne.com/products/dp/vitamin-d-5000-nsf', true),
  ('Super EPA', 'Thorne', 'Fish Oil & Omegas', 'Omega-3 fatty acids from fish oil that support cardiovascular, brain, and joint health. Helps manage inflammation from training.', 'https://www.thorne.com/products/dp/super-epa-nsf', true),
  ('B-Complex #6', 'Thorne', 'Vitamins', 'A complete B complex formula designed for the unique needs of athletes. Supports energy metabolism and nervous system function.', 'https://www.thorne.com/products/dp/b-complex-6', true),

  -- Minerals
  ('Magnesium Bisglycinate', 'Thorne', 'Minerals', 'Highly absorbable magnesium that supports muscle relaxation, sleep quality, and recovery. Important for athletes with high training loads.', 'https://www.thorne.com/products/dp/magnesium-bisglycinate', false),
  ('Iron Bisglycinate', 'Thorne', 'Minerals', 'A well-absorbed form of iron that reduces gastrointestinal side effects. Important for female athletes and endurance sports.', 'https://www.thorne.com/products/dp/iron-bisglycinate', false),
  ('Zinc Picolinate 30mg', 'Thorne', 'Minerals', 'A well-researched form of zinc with superior absorption. Supports immune function, wound healing, and testosterone production.', 'https://www.thorne.com/products/dp/zinc-picolinate-30-mg-nsf', true),

  -- Gut Health
  ('FloraSport 20B', 'Thorne', 'Gut Health', 'Four unique probiotic strains providing 20 billion live organisms per capsule. Supports digestive health and immune function in athletes.', 'https://www.thorne.com/products/dp/florasport-20b', true),

  -- Sleep & Recovery
  ('Melaton-3', 'Thorne', 'Sleep', 'Supports restful sleep and helps maintain normal circadian rhythms. Useful for athletes with disrupted sleep schedules from travel or competition.', 'https://www.thorne.com/products/dp/melaton-3', true),
  ('Glutathione-SR', 'Thorne', 'Recovery', 'A sustained-release form of one of the body''s most important antioxidants. Supports detoxification and recovery from oxidative stress.', 'https://www.thorne.com/products/dp/glutathione-sr', true),
  ('NiaCel 400', 'Thorne', 'Recovery', 'Supports brain and body vitality with Nicotinamide Riboside (NR). Promotes cellular energy and healthy aging.', 'https://www.thorne.com/products/dp/niacel-400', false),

  -- Stacks
  ('Foundational Stack for Athletes', 'Thorne', 'Stacks', 'A trio of supplements to meet the foundational nutrition needs of athletes. Fills common nutritional gaps found in athletic diets.', 'https://www.thorne.com/products/dp/foundational-stack-for-athletes', true),
  ('Training Stack', 'Thorne', 'Stacks', 'A trio of supplements designed to support an athlete''s training and competition goals. Covers pre, during, and post-workout needs.', 'https://www.thorne.com/products/dp/training-stack-lemon', true);
