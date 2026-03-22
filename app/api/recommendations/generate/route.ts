import { OpenAI } from 'openai'
import { createClient } from '@supabase/supabase-js'
import { calculateNutritionRecommendation } from '@/lib/nutrition-calculator'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { athleteId } = await request.json()
    
    if (!athleteId) {
      return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get athlete data
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Get athlete profile for name and email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', athlete.profile_id)
      .single()

    // Prepare athlete profile for calculation
    const athleteProfile = {
      age: athlete.age || 16,
      sex: (athlete.sex || 'male') as 'male' | 'female',
      weight_lbs: athlete.weight_lbs || 150,
      height_inches: athlete.height_inches || 70,
      body_fat_percentage: athlete.body_fat_percentage,
      sport: athlete.sport || 'Unknown',
      position: athlete.position,
      goal_phase: athlete.goal_phase || 'maintain_performance',
      training_days_per_week: parseInt(athlete.training_schedule || '5'),
      season_phase: athlete.season_phase || 'offseason',
    }

    // Calculate evidence-based recommendations
    const recommendation = calculateNutritionRecommendation(athleteProfile)

    // Use Claude for personalized coaching context and next steps
    const coachingPrompt = `You are a sports nutrition coach providing personalized guidance to a high school/college athlete.

Athlete Profile:
- Name: ${profile?.full_name || 'Athlete'}
- Sport: ${athleteProfile.sport}
- Position: ${athleteProfile.position || 'N/A'}
- Goal: ${athleteProfile.goal_phase}
- Age: ${athleteProfile.age}
- Weight: ${athleteProfile.weight_lbs} lbs
- Training: ${athleteProfile.training_days_per_week} days/week

AI-Calculated Nutrition Targets (Evidence-Based):
- Daily Calories: ${recommendation.daily_calories}
- Protein: ${recommendation.daily_protein_g}g
- Carbs: ${recommendation.daily_carbs_g}g
- Fat: ${recommendation.daily_fat_g}g

Based on these targets, provide:
1. A brief personalized coaching message (2-3 sentences) about why these targets are right for them
2. One specific, actionable next step they can take today

Keep it motivating and specific to their sport/position. Format as JSON:
{
  "coaching_message": "...",
  "next_step": "..."
}`

    const coachingResponse = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: coachingPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    let coachingData = { coaching_message: '', next_step: '' }
    try {
      const coachingText = coachingResponse.choices[0].message.content || ''
      const jsonMatch = coachingText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        coachingData = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('Error parsing coaching response:', e)
    }

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from('nutrition_recommendations')
      .upsert({
        athlete_id: athleteId,
        daily_calories: recommendation.daily_calories,
        daily_protein_g: recommendation.daily_protein_g,
        daily_carbs_g: recommendation.daily_carbs_g,
        daily_fat_g: recommendation.daily_fat_g,
        reasoning: `${recommendation.methodology}\n\nCoaching: ${coachingData.coaching_message}`,
      })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({
      ...saved,
      methodology: recommendation.methodology,
      notes: recommendation.notes,
      coaching_message: coachingData.coaching_message,
      next_step: coachingData.next_step,
    })
  } catch (error: any) {
    console.error('Recommendation generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate recommendations' }, { status: 500 })
  }
}
