import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode, message, photo } = body
    // mode: 'fix_macros' | 'grocery_list' | 'question'

    // Fetch athlete data for context
    const { data: athlete } = await supabase
      .from('athletes')
      .select('*, profiles!athletes_profile_id_fkey(full_name)')
      .eq('profile_id', user.id)
      .single()

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 })
    }

    const name = (athlete as any).profiles?.full_name || 'Athlete'
    const sport = athlete.sport || 'general fitness'
    const userType = athlete.user_type || 'athlete'
    const goalPhase = athlete.goal_phase?.replace(/_/g, ' ') || 'general health'
    const trainingStyle = athlete.training_style || ''

    // Get today's macro targets
    const calorieGoal = athlete.calorie_goal || 2000
    const proteinGoal = athlete.protein_goal || 150
    const carbsGoal = athlete.carbs_goal || 250
    const fatGoal = athlete.fat_goal || 65

    // Get today's logged meals
    const today = new Date().toISOString().split('T')[0]
    const { data: todayMeals } = await supabase
      .from('meal_logs')
      .select('meal_title, calories, protein_g, carbs_g, fat_g, logged_at')
      .eq('athlete_id', athlete.id)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: true })

    const consumed = {
      calories: (todayMeals || []).reduce((s, m) => s + (m.calories || 0), 0),
      protein: (todayMeals || []).reduce((s, m) => s + (m.protein_g || 0), 0),
      carbs: (todayMeals || []).reduce((s, m) => s + (m.carbs_g || 0), 0),
      fat: (todayMeals || []).reduce((s, m) => s + (m.fat_g || 0), 0),
    }

    const remaining = {
      calories: Math.max(0, calorieGoal - consumed.calories),
      protein: Math.max(0, proteinGoal - consumed.protein),
      carbs: Math.max(0, carbsGoal - consumed.carbs),
      fat: Math.max(0, fatGoal - consumed.fat),
    }

    const mealsLogged = todayMeals?.map(m => `- ${m.meal_title}: ${m.calories} cal, ${m.protein_g}g P, ${m.carbs_g}g C, ${m.fat_g}g F`).join('\n') || 'No meals logged yet today.'

    const contextBlock = `
ATHLETE CONTEXT:
- Name: ${name}
- Type: ${userType === 'member' ? 'General fitness enthusiast' : `Competitive athlete (${sport})`}
- Goal: ${goalPhase}
${trainingStyle ? `- Training style: ${trainingStyle}` : ''}

DAILY MACRO TARGETS:
- Calories: ${calorieGoal} kcal
- Protein: ${proteinGoal}g
- Carbs: ${carbsGoal}g
- Fat: ${fatGoal}g

TODAY'S INTAKE SO FAR:
- Calories: ${consumed.calories} / ${calorieGoal} kcal (${remaining.calories} remaining)
- Protein: ${consumed.protein}g / ${proteinGoal}g (${remaining.protein}g remaining)
- Carbs: ${consumed.carbs}g / ${carbsGoal}g (${remaining.carbs}g remaining)
- Fat: ${consumed.fat}g / ${fatGoal}g (${remaining.fat}g remaining)

MEALS LOGGED TODAY:
${mealsLogged}
`

    let systemPrompt: string
    let userPrompt: string

    if (mode === 'fix_macros') {
      systemPrompt = `You are a friendly, expert nutrition coach AI built into the Fuel Different app. You help athletes and fitness enthusiasts find the perfect meal to hit their remaining macro targets for the day.

${contextBlock}

INSTRUCTIONS:
- Suggest 2-3 specific, practical meal ideas that would help them hit their remaining macros
- Each suggestion should include the meal name, estimated macros (calories, protein, carbs, fat), and a brief description
- Prioritize meals that are realistic and easy to prepare
- Consider what they've already eaten today to avoid repetition
- Be encouraging and specific
- Format your response in a conversational, friendly tone
- Use simple formatting with meal names in bold

If the user provides additional context (like available ingredients, dietary restrictions, or preferences), incorporate that into your suggestions.`

      userPrompt = message || `I need help hitting my remaining macros for today. What should I eat next?`

    } else if (mode === 'grocery_list') {
      systemPrompt = `You are a friendly, expert nutrition coach AI built into the Fuel Different app. You help athletes and fitness enthusiasts build smart grocery lists that align with their macro targets and goals.

${contextBlock}

INSTRUCTIONS:
- Generate a practical weekly grocery list organized by category (Proteins, Produce, Grains & Carbs, Dairy, Pantry Staples, Snacks)
- Each item should be a specific product with approximate quantity
- The list should support hitting their daily macro targets across a full week
- Prioritize whole, nutrient-dense foods
- Include variety so meals don't get boring
- Consider their goal phase and training style
- If the user mentions specific preferences, dietary restrictions, or budget constraints, incorporate those
- Be practical — suggest items available at any standard grocery store
- Format with clear categories and bullet points`

      userPrompt = message || `Build me a weekly grocery list that will help me hit my macro targets consistently.`

    } else {
      // General nutrition Q&A
      systemPrompt = `You are a friendly, expert nutrition coach AI built into the Fuel Different app. You answer nutrition questions with evidence-based advice personalized to the athlete's profile and goals.

${contextBlock}

INSTRUCTIONS:
- Answer the question directly and specifically
- Personalize your answer based on their profile, goals, and current intake
- Reference their actual macro targets and today's intake when relevant
- Keep answers concise but thorough (2-4 paragraphs max)
- Cite general nutrition science principles when applicable
- Be encouraging and supportive
- If the question is outside your expertise (medical advice, injury treatment, etc.), recommend they consult a healthcare professional
- Never recommend specific supplement brands`

      userPrompt = message || 'What should I know about my nutrition today?'
    }

    const content: any[] = []

    // Handle photo if provided (for "here's what I have" scenarios)
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({
      response: text,
      context: {
        remaining,
        consumed,
        targets: { calories: calorieGoal, protein: proteinGoal, carbs: carbsGoal, fat: fatGoal },
        mealsLoggedCount: todayMeals?.length || 0,
      },
    })

  } catch (error: any) {
    console.error('Meal assistant error:', error)
    return NextResponse.json({ error: error.message || 'Assistant failed' }, { status: 500 })
  }
}
