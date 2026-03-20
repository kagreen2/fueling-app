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

    const prompt = `You are a sports nutrition AI for a performance fueling app used by high school and college athletes.

Analyze this meal and return a JSON response with macro estimates and coaching feedback.

${mealTitle ? `Meal name: ${mealTitle}` : ''}
${description ? `Athlete description: ${description}` : ''}

Return ONLY valid JSON in exactly this format, no other text:
{
  "mealTitle": "short descriptive name",
  "calories": 650,
  "protein": 45,
  "carbs": 60,
  "fat": 18,
  "confidence": "high",
  "feedback": "2-3 sentence coaching feedback about this meal for an athlete",
  "nextStep": "one specific actionable suggestion for their next meal or snack",
  "clarifyingQuestion": null
}

Rules:
- confidence must be "high", "medium", or "low"
- All macro values must be numbers not strings
- feedback should be encouraging but honest
- nextStep should relate to their training and recovery needs
- If you cannot identify the food set confidence to "low" and ask a clarifying question`

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