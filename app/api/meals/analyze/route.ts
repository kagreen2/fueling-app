import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    // Auth check - verify user is logged in
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the athlete record to determine user_type and context
    const { data: athlete } = await supabase
      .from('athletes')
      .select('user_type, sport, training_style, activity_level, goal_phase')
      .eq('profile_id', user.id)
      .single()

    const userType = athlete?.user_type || 'athlete'
    const sport = athlete?.sport || null
    const trainingStyle = athlete?.training_style || null
    const activityLevel = athlete?.activity_level || null
    const goalPhase = athlete?.goal_phase || null

    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const description = formData.get('description') as string || ''
    const mealTitle = formData.get('mealTitle') as string || ''

    const messages: any[] = []
    const content: any[] = []

    if (photo) {
      const bytes = await photo.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mediaType = photo.type as 'image/jpeg' | 'image/png' | 'image/webp'

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64,
        },
      })
    }

    // Build context-aware prompt based on user type
    let roleDescription: string
    let feedbackGuidance: string
    let nextStepGuidance: string

    if (userType === 'member') {
      // General fitness / wellness member
      const styleContext = trainingStyle ? ` Their training style is ${trainingStyle}.` : ''
      const levelContext = activityLevel ? ` Their activity level is ${activityLevel}.` : ''
      const goalContext = goalPhase ? ` Their current goal is: ${goalPhase.replace(/_/g, ' ')}.` : ''

      roleDescription = `You are an expert nutrition coach AI for a wellness and fitness app. Your user is a general fitness enthusiast (not a competitive athlete).${styleContext}${levelContext}${goalContext}

Your job is to analyze meals and provide accurate macro estimates and personalized coaching feedback to help them reach their health and fitness goals.`

      feedbackGuidance = `feedback should be encouraging, specific, and relate to their general health, energy levels, body composition goals, and overall wellness — NOT competitive sports performance. Do not reference high school, college, or competitive athletics.`

      nextStepGuidance = `nextStep should suggest complementary foods, portion adjustments, or meal timing tips for their fitness and wellness goals`
    } else {
      // Competitive athlete
      const sportContext = sport ? ` They play ${sport}.` : ''
      const goalContext = goalPhase ? ` Their current goal is: ${goalPhase.replace(/_/g, ' ')}.` : ''

      roleDescription = `You are an expert sports nutrition coach AI for a performance fueling app used by competitive athletes.${sportContext}${goalContext}

Your job is to analyze meals and provide accurate macro estimates and personalized coaching feedback to help athletes optimize their performance and recovery.`

      feedbackGuidance = `feedback should be encouraging, specific, and relate to athletic performance and recovery`

      nextStepGuidance = `nextStep should suggest complementary foods or timing for better recovery and performance`
    }

    const prompt = `${roleDescription}

${mealTitle ? `Meal name: ${mealTitle}` : ''}
${description ? `User description: ${description}` : ''}

Analyze this meal carefully and provide:
1. Accurate calorie and macro estimates (protein, carbs, fat in grams)
2. Your confidence level in the estimate
3. Coaching feedback that's encouraging and specific
4. One actionable next step for their nutrition

Return ONLY valid JSON in exactly this format, no other text:
{
  "mealTitle": "short descriptive name of the meal",
  "calories": 650,
  "protein": 45,
  "carbs": 60,
  "fat": 18,
  "confidence": "high",
  "feedback": "2-3 sentence coaching feedback about this meal's quality",
  "nextStep": "one specific actionable suggestion for their next meal or snack",
  "clarifyingQuestion": null
}

Rules:
- confidence must be "high", "medium", or "low" based on how clearly you can identify the food
- All macro values must be numbers (not strings) in grams
- Calories should be realistic for the portion size visible
- ${feedbackGuidance}
- ${nextStepGuidance}
- If you cannot identify the food clearly, set confidence to "low" and provide a clarifying question instead
- For high confidence estimates, provide specific benefits in the feedback`

    content.push({ type: 'text', text: prompt })
    messages.push({ role: 'user', content })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Meal analysis error:', error)
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
  }
}
