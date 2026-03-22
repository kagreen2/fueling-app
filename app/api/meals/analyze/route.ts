import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
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

    const prompt = `You are an expert sports nutrition coach AI for a performance fueling app used by high school and college athletes.

Your job is to analyze meals and provide accurate macro estimates and personalized coaching feedback to help athletes optimize their performance and recovery.

${mealTitle ? `Meal name: ${mealTitle}` : ''}
${description ? `Athlete description: ${description}` : ''}

Analyze this meal carefully and provide:
1. Accurate calorie and macro estimates (protein, carbs, fat in grams)
2. Your confidence level in the estimate
3. Coaching feedback that's encouraging and specific to athletic performance
4. One actionable next step for their nutrition

Return ONLY valid JSON in exactly this format, no other text:
{
  "mealTitle": "short descriptive name of the meal",
  "calories": 650,
  "protein": 45,
  "carbs": 60,
  "fat": 18,
  "confidence": "high",
  "feedback": "2-3 sentence coaching feedback about this meal's quality for athletic performance and recovery",
  "nextStep": "one specific actionable suggestion for their next meal or snack to optimize their fueling",
  "clarifyingQuestion": null
}

Rules:
- confidence must be "high", "medium", or "low" based on how clearly you can identify the food
- All macro values must be numbers (not strings) in grams
- Calories should be realistic for the portion size visible
- feedback should be encouraging, specific, and relate to athletic performance
- nextStep should suggest complementary foods or timing for better recovery
- If you cannot identify the food clearly, set confidence to "low" and provide a clarifying question instead
- For high confidence estimates, provide specific performance benefits in the feedback`

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