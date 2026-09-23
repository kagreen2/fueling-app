import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

type Mode = 'fix_macros' | 'grocery_list' | 'question'

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sanitizeDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return new Date().toISOString().split('T')[0]
}

async function loadMealAssistantContext(supabase: any, profileId: string, requestedDate?: unknown) {
  const currentDate = sanitizeDate(requestedDate)

  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('*, profiles!athletes_profile_id_fkey(full_name)')
    .eq('profile_id', profileId)
    .single()

  if (athleteError || !athlete) {
    throw new Error('Athlete profile not found')
  }

  const { data: recommendations } = await supabase
    .from('nutrition_recommendations')
    .select('daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g')
    .eq('athlete_id', athlete.id)
    .maybeSingle()

  const targets = {
    calories: Math.round(numberValue(recommendations?.daily_calories ?? athlete.calorie_goal, 2000)),
    protein: Math.round(numberValue(recommendations?.daily_protein_g ?? athlete.protein_goal, 150)),
    carbs: Math.round(numberValue(recommendations?.daily_carbs_g ?? athlete.carbs_goal, 250)),
    fat: Math.round(numberValue(recommendations?.daily_fat_g ?? athlete.fat_goal, 65)),
  }

  const { data: todayMeals, error: mealsError } = await supabase
    .from('meal_logs')
    .select('meal_title, calories, protein, carbs, fat, logged_at, date')
    .eq('athlete_id', athlete.id)
    .eq('date', currentDate)
    .order('logged_at', { ascending: true })

  if (mealsError) throw mealsError

  const meals = todayMeals || []
  const consumed = {
    calories: Math.round(meals.reduce((sum: number, meal: any) => sum + numberValue(meal.calories), 0)),
    protein: Math.round(meals.reduce((sum: number, meal: any) => sum + numberValue(meal.protein), 0)),
    carbs: Math.round(meals.reduce((sum: number, meal: any) => sum + numberValue(meal.carbs), 0)),
    fat: Math.round(meals.reduce((sum: number, meal: any) => sum + numberValue(meal.fat), 0)),
  }

  const remaining = {
    calories: Math.max(0, targets.calories - consumed.calories),
    protein: Math.max(0, targets.protein - consumed.protein),
    carbs: Math.max(0, targets.carbs - consumed.carbs),
    fat: Math.max(0, targets.fat - consumed.fat),
  }

  const mealsLogged = meals.length > 0
    ? meals.map((meal: any) => `- ${meal.meal_title || 'Meal'}: ${Math.round(numberValue(meal.calories))} cal, ${Math.round(numberValue(meal.protein))}g P, ${Math.round(numberValue(meal.carbs))}g C, ${Math.round(numberValue(meal.fat))}g F`).join('\n')
    : 'No meals logged yet today.'

  const publicContext = {
    remaining,
    consumed,
    targets,
    mealsLoggedCount: meals.length,
    date: currentDate,
    hasRecommendation: Boolean(recommendations),
  }

  return {
    athlete,
    name: (athlete as any).profiles?.full_name || 'Athlete',
    sport: athlete.sport || 'general fitness',
    userType: athlete.user_type || 'athlete',
    goalPhase: athlete.goal_phase?.replace(/_/g, ' ') || 'general health',
    trainingStyle: athlete.training_style || '',
    currentDate,
    targets,
    consumed,
    remaining,
    mealsLogged,
    publicContext,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const date = request.nextUrl.searchParams.get('date')
    const context = await loadMealAssistantContext(supabase, user.id, date)
    return NextResponse.json({ context: context.publicContext })
  } catch (error: any) {
    console.error('Meal assistant context error:', error)
    const status = error.message === 'Athlete profile not found' ? 404 : 500
    return NextResponse.json({ error: error.message || 'Unable to load macro context' }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode, message, photo, date } = body
    const activeMode: Mode = mode === 'fix_macros' || mode === 'grocery_list' || mode === 'question' ? mode : 'question'

    const context = await loadMealAssistantContext(supabase, user.id, date)
    const { name, sport, userType, goalPhase, trainingStyle, targets, consumed, remaining, mealsLogged } = context

    const contextBlock = `
ATHLETE CONTEXT:
- Name: ${name}
- Type: ${userType === 'member' ? 'General fitness enthusiast' : `Competitive athlete (${sport})`}
- Goal: ${goalPhase}
${trainingStyle ? `- Training style: ${trainingStyle}` : ''}

DAILY MACRO TARGETS FROM FUEL DIFFERENT:
- Calories: ${targets.calories} kcal
- Protein: ${targets.protein}g
- Carbs: ${targets.carbs}g
- Fat: ${targets.fat}g

TODAY'S INTAKE SO FAR:
- Calories: ${consumed.calories} / ${targets.calories} kcal (${remaining.calories} remaining)
- Protein: ${consumed.protein}g / ${targets.protein}g (${remaining.protein}g remaining)
- Carbs: ${consumed.carbs}g / ${targets.carbs}g (${remaining.carbs}g remaining)
- Fat: ${consumed.fat}g / ${targets.fat}g (${remaining.fat}g remaining)

MEALS LOGGED TODAY:
${mealsLogged}
`

    let systemPrompt: string
    let userPrompt: string

    if (activeMode === 'fix_macros') {
      systemPrompt = `You are a friendly, expert nutrition coach AI built into the Fuel Different app. You help athletes and fitness enthusiasts choose practical foods based on their saved macro targets and today's logged intake.

${contextBlock}

INSTRUCTIONS:
- Use the Fuel Different macro targets and remaining macros above as the source of truth. Do not ask the athlete to retype calories, protein, carbs, or fat.
- Suggest 2-3 specific, practical meal or snack ideas that fit the remaining macros.
- Include estimated macros for each suggestion: calories, protein, carbs, and fat.
- If a macro is already over target, say so briefly and suggest options that keep that macro low while still supporting protein, carbs, or calories as needed.
- Prioritize realistic foods, exact portions, and easy swaps.
- Consider what they have already eaten today to avoid repetition.
- Be encouraging, concise, and specific.
- Use simple formatting with meal names in bold.

If the user provides additional context like available ingredients, dietary restrictions, or preferences, incorporate that while still anchoring the suggestions to their current macro context.`

      userPrompt = message || 'Use my Fuel Different macro targets and what I have logged today. What should I eat next?'
    } else if (activeMode === 'grocery_list') {
      systemPrompt = `You are a friendly, expert nutrition coach AI built into the Fuel Different app. You help athletes and fitness enthusiasts build smart grocery lists that align with their saved macro targets and goals.

${contextBlock}

INSTRUCTIONS:
- Use the saved daily macro targets above. Do not ask the athlete to retype their macros.
- Generate a practical grocery list organized by category: Proteins, Produce, Grains & Carbs, Dairy, Pantry Staples, Snacks.
- Each item should be a specific food with approximate quantity.
- The list should support consistently hitting their daily calories, protein, carbs, and fat across a full week.
- Prioritize whole, nutrient-dense foods and include convenient options.
- Consider their goal phase, training style, and any preferences, restrictions, or budget details the athlete mentions.
- Format with clear categories and bullet points.`

      userPrompt = message || 'Build me a weekly grocery list that will help me hit my Fuel Different macro targets consistently.'
    } else {
      systemPrompt = `You are a friendly, expert nutrition coach AI built into the Fuel Different app. You answer nutrition questions with evidence-based advice personalized to the athlete's saved targets, logged intake, profile, and goals.

${contextBlock}

INSTRUCTIONS:
- Use the saved macro targets and today's logged intake above whenever the answer involves meal timing, meal suggestions, protein, carbs, fat, or calories.
- Do not ask the athlete to retype their macros.
- Answer directly and specifically.
- Keep answers concise but useful.
- Be encouraging and supportive.
- If the question is outside your scope, such as medical advice or injury treatment, recommend they consult a healthcare professional.
- Never recommend specific supplement brands.`

      userPrompt = message || 'What should I know about my nutrition today?'
    }

    const content: any[] = []

    if (photo) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: photo,
        },
      })
    }

    content.push({ type: 'text', text: userPrompt })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    return NextResponse.json({
      response: text,
      context: context.publicContext,
    })
  } catch (error: any) {
    console.error('Meal assistant error:', error)
    const status = error.message === 'Athlete profile not found' ? 404 : 500
    return NextResponse.json({ error: error.message || 'Assistant failed' }, { status })
  }
}
