import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Determine media type
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mediaType)) {
      return NextResponse.json({ error: 'Unsupported image format. Use JPEG, PNG, or WebP.' }, { status: 400 })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `This is an InBody 580 result sheet. Extract ALL metrics from the printout. Return ONLY a valid JSON object with the fields below. Use null for any value you cannot read clearly. All weight/mass values should be in pounds (lbs). If the printout uses kg, convert to lbs (multiply by 2.205).

{
  "weight_lbs": number or null,

  "intracellular_water_lbs": number or null,
  "extracellular_water_lbs": number or null,
  "dry_lean_mass_lbs": number or null,
  "body_fat_mass_lbs": number or null,
  "total_body_water_lbs": number or null,
  "fat_free_mass_lbs": number or null,

  "skeletal_muscle_mass_lbs": number or null,

  "bmi": number or null,
  "percent_body_fat": number or null,

  "seg_lean_right_arm_lbs": number or null,
  "seg_lean_left_arm_lbs": number or null,
  "seg_lean_trunk_lbs": number or null,
  "seg_lean_right_leg_lbs": number or null,
  "seg_lean_left_leg_lbs": number or null,

  "phase_angle_right_arm": number or null,
  "phase_angle_left_arm": number or null,
  "phase_angle_trunk": number or null,
  "phase_angle_right_leg": number or null,
  "phase_angle_left_leg": number or null,

  "ecw_tbw_ratio": number or null,
  "phase_angle_whole_body": number or null,

  "seg_ecw_right_arm_lbs": number or null,
  "seg_ecw_left_arm_lbs": number or null,
  "seg_ecw_trunk_lbs": number or null,
  "seg_ecw_right_leg_lbs": number or null,
  "seg_ecw_left_leg_lbs": number or null,

  "seg_icw_right_arm_lbs": number or null,
  "seg_icw_left_arm_lbs": number or null,
  "seg_icw_trunk_lbs": number or null,
  "seg_icw_right_leg_lbs": number or null,
  "seg_icw_left_leg_lbs": number or null,

  "visceral_fat_area_cm2": number or null
}

IMPORTANT: Read the numbers carefully. The "Segmental Lean Analysis" section has lean mass values per limb/trunk. The "Phase Angle" values appear next to each segment. The "ECW/TBW" ratio and whole-body phase angle are in their own section. Visceral Fat Area is in cm².

Return ONLY the JSON object, no markdown, no explanation, no code fences.`,
            },
          ],
        },
      ],
    })

    // Extract the text response
    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Failed to extract data from image' }, { status: 500 })
    }

    // Parse the JSON response
    let extractedData
    try {
      // Clean up response in case Claude wraps it in code fences
      let jsonStr = textBlock.text.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      extractedData = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textBlock.text)
      return NextResponse.json({ 
        error: 'Could not parse the extracted data. Please enter values manually.',
        raw: textBlock.text 
      }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    })
  } catch (error: any) {
    console.error('Biometric scan error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to process scan photo' 
    }, { status: 500 })
  }
}
