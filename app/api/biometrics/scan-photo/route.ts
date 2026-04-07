import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const SCAN_PROMPTS: Record<string, string> = {
  'InBody 580': `This is an InBody 580 result sheet. Extract ALL metrics from the printout. Return ONLY a valid JSON object with the fields below. Use null for any value you cannot read clearly. All weight/mass values should be in pounds (lbs). If the printout uses kg, convert to lbs (multiply by 2.205).

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
  "ecw_tbw_ratio": number or null,
  "visceral_fat_area_cm2": number or null
}

IMPORTANT: Read the numbers carefully. The "Segmental Lean Analysis" section has lean mass values per limb/trunk. The "ECW/TBW" ratio is in its own section. Visceral Fat Area is in cm².

Return ONLY the JSON object, no markdown, no explanation, no code fences.`,

  'DEXA Scan': `This is a DEXA (Dual-Energy X-ray Absorptiometry) scan result. DEXA reports vary by manufacturer (Hologic, GE Lunar, Norland, etc.) but contain similar data. Extract ALL metrics you can find from this printout. Return ONLY a valid JSON object with the fields below. Use null for any value you cannot read clearly. All weight/mass values should be in pounds (lbs). If the printout uses kg, convert to lbs (multiply by 2.205). If the printout uses grams, convert to lbs (divide by 453.592).

{
  "weight_lbs": number or null,
  "body_fat_mass_lbs": number or null,
  "fat_free_mass_lbs": number or null,
  "skeletal_muscle_mass_lbs": number or null,
  "percent_body_fat": number or null,
  "bmi": number or null,
  "bone_mineral_content_lbs": number or null,
  "bone_mineral_density": number or null,
  "total_body_water_lbs": number or null,
  "seg_lean_right_arm_lbs": number or null,
  "seg_lean_left_arm_lbs": number or null,
  "seg_lean_trunk_lbs": number or null,
  "seg_lean_right_leg_lbs": number or null,
  "seg_lean_left_leg_lbs": number or null,
  "seg_fat_right_arm_lbs": number or null,
  "seg_fat_left_arm_lbs": number or null,
  "seg_fat_trunk_lbs": number or null,
  "seg_fat_right_leg_lbs": number or null,
  "seg_fat_left_leg_lbs": number or null,
  "visceral_fat_area_cm2": number or null,
  "android_fat_percent": number or null,
  "gynoid_fat_percent": number or null
}

IMPORTANT: DEXA reports often show regional body composition data. Look for sections labeled "Region", "Composition", "Total Body", or similar. The report may show values in grams — convert to lbs. Lean mass may be labeled as "Lean" or "Lean+BMC" or "Tissue". Fat mass may be labeled as "Fat" or "Fat Mass". Look for visceral adipose tissue (VAT) if present. T-scores and Z-scores for bone density may also be present.

Return ONLY the JSON object, no markdown, no explanation, no code fences.`,

  'Bod Pod': `This is a Bod Pod (Air Displacement Plethysmography) result sheet. Extract ALL metrics from the printout. Return ONLY a valid JSON object with the fields below. Use null for any value you cannot read clearly. All weight/mass values should be in pounds (lbs). If the printout uses kg, convert to lbs (multiply by 2.205).

{
  "weight_lbs": number or null,
  "body_fat_mass_lbs": number or null,
  "fat_free_mass_lbs": number or null,
  "percent_body_fat": number or null,
  "body_volume_liters": number or null,
  "body_density": number or null,
  "bmi": number or null,
  "resting_metabolic_rate": number or null,
  "total_energy_expenditure": number or null,
  "thoracic_gas_volume_liters": number or null
}

IMPORTANT: Bod Pod reports typically show body density, body volume, and fat/lean mass breakdown. They may also include estimated resting metabolic rate (RMR) and total energy expenditure (TEE). Read all numbers carefully.

Return ONLY the JSON object, no markdown, no explanation, no code fences.`,

  'Skinfold Calipers': `This is a skinfold caliper measurement result sheet or record. Extract ALL metrics you can find. Return ONLY a valid JSON object with the fields below. Use null for any value you cannot read clearly. All weight/mass values should be in pounds (lbs). If the printout uses kg, convert to lbs (multiply by 2.205).

{
  "weight_lbs": number or null,
  "percent_body_fat": number or null,
  "body_fat_mass_lbs": number or null,
  "fat_free_mass_lbs": number or null,
  "skeletal_muscle_mass_lbs": number or null,
  "bmi": number or null
}

IMPORTANT: Skinfold results may show individual site measurements (chest, abdomen, thigh, tricep, etc.) and a calculated body fat percentage. Focus on extracting the summary values. If only body fat % and weight are available, calculate fat mass and lean mass.

Return ONLY the JSON object, no markdown, no explanation, no code fences.`,

  'BIA Scale': `This is a Bioelectrical Impedance Analysis (BIA) scale result sheet or printout. These come from smart scales like Tanita, Omron, Withings, etc. Extract ALL metrics you can find. Return ONLY a valid JSON object with the fields below. Use null for any value you cannot read clearly. All weight/mass values should be in pounds (lbs). If the printout uses kg, convert to lbs (multiply by 2.205).

{
  "weight_lbs": number or null,
  "body_fat_mass_lbs": number or null,
  "fat_free_mass_lbs": number or null,
  "skeletal_muscle_mass_lbs": number or null,
  "percent_body_fat": number or null,
  "bmi": number or null,
  "total_body_water_lbs": number or null,
  "visceral_fat_area_cm2": number or null,
  "ecw_tbw_ratio": number or null
}

IMPORTANT: BIA scales vary widely in what they report. Extract whatever values are available. Some may show muscle mass, bone mass, water percentage, metabolic age, etc.

Return ONLY the JSON object, no markdown, no explanation, no code fences.`,

  'Other': `This is a body composition scan or measurement result. I'm not sure what type of scan this is. Please analyze the document and extract ALL body composition metrics you can find. Return ONLY a valid JSON object with the fields below. Use null for any value you cannot read clearly. All weight/mass values should be in pounds (lbs). If the printout uses kg, convert to lbs (multiply by 2.205).

{
  "weight_lbs": number or null,
  "body_fat_mass_lbs": number or null,
  "fat_free_mass_lbs": number or null,
  "skeletal_muscle_mass_lbs": number or null,
  "percent_body_fat": number or null,
  "bmi": number or null,
  "total_body_water_lbs": number or null,
  "visceral_fat_area_cm2": number or null,
  "seg_lean_right_arm_lbs": number or null,
  "seg_lean_left_arm_lbs": number or null,
  "seg_lean_trunk_lbs": number or null,
  "seg_lean_right_leg_lbs": number or null,
  "seg_lean_left_leg_lbs": number or null,
  "ecw_tbw_ratio": number or null
}

IMPORTANT: Try to identify the type of scan from the document and extract as many values as possible. Use null for anything not present.

Return ONLY the JSON object, no markdown, no explanation, no code fences.`,
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('photo') as File | null
    const scanType = (formData.get('scanType') as string) || 'InBody 580'

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

    // Get the appropriate prompt for this scan type
    const prompt = SCAN_PROMPTS[scanType] || SCAN_PROMPTS['Other']

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
              text: prompt,
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
      scanType,
      data: extractedData,
    })
  } catch (error: any) {
    console.error('Biometric scan error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to process scan photo' 
    }, { status: 500 })
  }
}
