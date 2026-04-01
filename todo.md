# Supplement Feature — Build Checklist

## Database & Backend
- [ ] Create `supplement_library` table (name, brand, category, default_description, thorne_product_url, image_url)
- [ ] Create `supplement_recommendations` table (supplement_id, athlete_id, team_id, coach_id, coach_note, priority, timing, status)
- [ ] Create `athlete_supplement_status` table (recommendation_id, athlete_id, is_taking, started_at, stopped_at)
- [ ] Add RLS policies for all three tables
- [ ] Seed supplement library with common Thorne products

## Coach UI
- [ ] Supplement Library browse/search page (coach can view all available supplements)
- [ ] "Recommend Supplement" flow — pick supplement, choose athlete or team, add note, set priority/timing
- [ ] Coach supplement visibility dashboard — see which athletes are taking what
- [ ] Team-level recommendation support

## Athlete UI
- [ ] Athlete Supplements tab/page — see all recommendations from coach
- [ ] "Taking It" / "Not Taking" toggle per supplement
- [ ] Priority/timing display (Essential/Recommended/Optional + timing guidance)
- [ ] Thorne deep link per product + general Thorne dispensary button
- [ ] Coach's note/purpose displayed per supplement

## Integration
- [ ] Thorne affiliate dispensary link (prominent button)
- [ ] Product-specific deep links where available
- [ ] Notification when coach assigns new supplement (in-app)
