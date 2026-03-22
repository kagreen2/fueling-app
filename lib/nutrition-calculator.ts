/**
 * Evidence-Based Nutrition Calculator
 * Based on ISSN Position Stands, IOC Consensus, and NCAA Guidelines
 */

interface AthleteProfile {
  age: number
  sex: 'male' | 'female'
  weight_lbs: number
  height_inches: number
  body_fat_percentage?: number
  sport: string
  position?: string
  goal_phase: string
  training_days_per_week: number
  season_phase: string
}

interface NutritionRecommendation {
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
  methodology: string
  notes: string
}

/**
 * Calculate Resting Metabolic Rate using Mifflin-St Jeor equation
 * This is the most accurate formula for athletes
 */
function calculateRMR(
  weight_lbs: number,
  height_inches: number,
  age: number,
  sex: 'male' | 'female'
): number {
  const weight_kg = weight_lbs * 0.453592
  const height_cm = height_inches * 2.54

  if (sex === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  } else {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
  }
}

/**
 * Get activity multiplier based on training frequency and intensity
 * ISSN guidelines for athletes
 */
function getActivityMultiplier(
  training_days_per_week: number,
  sport: string,
  season_phase: string
): number {
  // Base multipliers for different training frequencies
  let baseMultiplier = 1.375 // Sedentary baseline

  if (training_days_per_week >= 5) {
    baseMultiplier = 1.725 // Very active (5-6 days/week)
  } else if (training_days_per_week >= 3) {
    baseMultiplier = 1.55 // Moderately active (3-4 days/week)
  } else if (training_days_per_week >= 1) {
    baseMultiplier = 1.375 // Lightly active (1-2 days/week)
  }

  // Sport-specific adjustments
  const highIntensitySports = ['football', 'rugby', 'hockey', 'basketball', 'soccer', 'lacrosse']
  const enduranceSports = ['cross country', 'track', 'swimming', 'rowing', 'cycling']

  if (highIntensitySports.includes(sport.toLowerCase())) {
    baseMultiplier *= 1.1 // 10% increase for high intensity
  } else if (enduranceSports.includes(sport.toLowerCase())) {
    baseMultiplier *= 1.15 // 15% increase for endurance
  }

  // Season phase adjustments
  if (season_phase === 'offseason') {
    baseMultiplier *= 0.95 // Slightly lower in offseason
  } else if (season_phase === 'preseason') {
    baseMultiplier *= 1.05 // Slightly higher in preseason
  } else if (season_phase === 'in_season') {
    baseMultiplier *= 1.1 // Higher during competition
  }

  return baseMultiplier
}

/**
 * Get protein recommendation based on goal and ISSN guidelines
 * Returns grams per kg body weight
 */
function getProteinMultiplier(goal_phase: string): number {
  switch (goal_phase.toLowerCase()) {
    case 'gain_muscle':
    case 'muscle_gain':
      return 1.6 // 1.6-2.0 g/kg for muscle gain (ISSN)
    case 'lose_fat':
    case 'fat_loss':
      return 1.6 // 1.6-2.2 g/kg for fat loss to preserve muscle (ISSN)
    case 'maintain_performance':
    case 'maintain':
    default:
      return 1.2 // 1.2-1.4 g/kg for maintenance (ISSN)
  }
}

/**
 * Get carbohydrate recommendation based on training intensity and volume
 * IOC Consensus guidelines
 */
function getCarbohydrateMultiplier(
  training_days_per_week: number,
  sport: string
): number {
  const enduranceSports = ['cross country', 'track', 'swimming', 'rowing', 'cycling', 'soccer']
  const isEndurance = enduranceSports.some(s => sport.toLowerCase().includes(s))

  if (training_days_per_week >= 5) {
    // High training volume
    if (isEndurance) {
      return 8 // 8-10 g/kg for high-volume endurance (IOC)
    } else {
      return 6 // 6-7 g/kg for high-volume strength/power
    }
  } else if (training_days_per_week >= 3) {
    // Moderate training volume
    if (isEndurance) {
      return 6 // 6-7 g/kg for moderate endurance
    } else {
      return 5 // 5-6 g/kg for moderate strength/power
    }
  } else {
    // Low training volume
    return 3 // 3-5 g/kg for light training
  }
}

/**
 * Get position-specific caloric adjustment
 * Some positions require more energy due to body size and demands
 */
function getPositionAdjustment(sport: string, position?: string): number {
  if (!position) return 1.0

  const sport_lower = sport.toLowerCase()
  const position_lower = position.toLowerCase()

  // Football position adjustments
  if (sport_lower.includes('football')) {
    if (
      position_lower.includes('lineman') ||
      position_lower.includes('tackle') ||
      position_lower.includes('guard') ||
      position_lower.includes('center')
    ) {
      return 1.1 // +10% for linemen (larger body mass)
    }
    if (
      position_lower.includes('linebacker') ||
      position_lower.includes('defensive end')
    ) {
      return 1.05 // +5% for defensive positions
    }
  }

  // Rugby position adjustments
  if (sport_lower.includes('rugby')) {
    if (position_lower.includes('prop') || position_lower.includes('hooker')) {
      return 1.1 // +10% for front row
    }
  }

  return 1.0
}

/**
 * Main recommendation function
 */
export function calculateNutritionRecommendation(
  athlete: AthleteProfile
): NutritionRecommendation {
  // Convert units
  const weight_kg = athlete.weight_lbs * 0.453592

  // Step 1: Calculate RMR
  const rmr = calculateRMR(
    athlete.weight_lbs,
    athlete.height_inches,
    athlete.age,
    athlete.sex
  )

  // Step 2: Get activity multiplier
  const activityMultiplier = getActivityMultiplier(
    athlete.training_days_per_week,
    athlete.sport,
    athlete.season_phase
  )

  // Step 3: Calculate TDEE
  let tdee = rmr * activityMultiplier

  // Step 4: Adjust for goal
  const goalPhase = athlete.goal_phase.toLowerCase()
  if (goalPhase.includes('gain') || goalPhase.includes('muscle')) {
    tdee += 300 // +300 cal surplus for muscle gain
  } else if (goalPhase.includes('lose') || goalPhase.includes('fat')) {
    tdee -= 300 // -300 cal deficit for fat loss
  }
  // else: maintain (no adjustment)

  // Step 5: Apply position adjustment
  const positionAdjustment = getPositionAdjustment(athlete.sport, athlete.position)
  tdee *= positionAdjustment

  // Step 6: Calculate macros
  const proteinMultiplier = getProteinMultiplier(athlete.goal_phase)
  const carbMultiplier = getCarbohydrateMultiplier(
    athlete.training_days_per_week,
    athlete.sport
  )

  const protein_g = Math.round(weight_kg * proteinMultiplier)
  const carbs_g = Math.round(weight_kg * carbMultiplier)

  // Fat: remaining calories (aim for 20-30% of total)
  const protein_cals = protein_g * 4
  const carbs_cals = carbs_g * 4
  const remaining_cals = tdee - protein_cals - carbs_cals
  const fat_g = Math.round(remaining_cals / 9)

  // Validate and adjust if needed
  const totalCals = protein_g * 4 + carbs_g * 4 + fat_g * 9
  const adjustedTdee = Math.round(totalCals)

  // Build methodology string
  const methodology = `
ISSN/IOC Evidence-Based Calculation:
- RMR (Mifflin-St Jeor): ${Math.round(rmr)} cal
- Activity Factor: ${activityMultiplier.toFixed(2)}x (${athlete.training_days_per_week} days/week)
- TDEE: ${Math.round(tdee)} cal
- Goal Adjustment: ${goalPhase.includes('gain') ? '+300' : goalPhase.includes('lose') ? '-300' : '0'} cal
- Position Adjustment: ${(positionAdjustment * 100 - 100).toFixed(0)}%
- Protein: ${proteinMultiplier.toFixed(1)}g/kg (${athlete.goal_phase})
- Carbs: ${carbMultiplier.toFixed(1)}g/kg (${athlete.sport})
  `.trim()

  const notes = `
Based on ISSN Position Stands and IOC Consensus guidelines.
${athlete.body_fat_percentage ? `Body Fat: ${athlete.body_fat_percentage}%` : 'Note: InBody scan would improve accuracy'}
${athlete.season_phase === 'in_season' ? 'In-season: Higher energy demands' : ''}
  `.trim()

  return {
    daily_calories: adjustedTdee,
    daily_protein_g: protein_g,
    daily_carbs_g: carbs_g,
    daily_fat_g: fat_g,
    methodology,
    notes,
  }
}
