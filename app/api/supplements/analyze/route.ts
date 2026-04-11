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

    const { name, brand, category } = await request.json()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a sports nutrition safety AI for a performance fueling app used by high school and college athletes.

Analyze this supplement for safety and appropriateness for a student athlete.

Supplement: ${name}
Brand: ${brand || 'Not specified'}
Category: ${category || 'Not specified'}

Return ONLY valid JSON in exactly this format, no other text:
{
  "riskLevel": "low",
  "explanation": "2-3 sentence explanation of what this supplement is and whether it is appropriate for a student athlete",
  "requiresParentApproval": false,
  "bannedWarning": null,
  "commonUse": "brief description of what athletes use this for",
  "recommendation": "one sentence recommendation"
}

Rules:
- riskLevel must be "low", "moderate", "high", or "banned"
- requiresParentApproval should be true for high risk supplements or anything with stimulants
- bannedWarning should be a string warning if the substance is banned by NCAA or WADA, otherwise null
- Be conservative — when in doubt rate higher risk
- Protein powder, creatine, vitamins = low risk
- Pre-workouts with stimulants = moderate to high risk
- SARMs, prohormones, steroids = banned`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse response' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}