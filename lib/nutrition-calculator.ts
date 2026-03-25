/**
 * Evidence-Based Nutrition Calculator
 * Based on ISSN Position Stands, IOC Consensus, and NCAA Guidelines
 * 
 * KEY PRINCIPLE: Protein is calculated per POUND of body weight (1.0-1.4 g/lb)
 * Macros are distributed as: Protein ~30-35%, Carbs ~40-45%, Fat ~20-25%
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
 */
function getActivityMultiplier(
  training_days_per_week: number,
  sport: string,
  season_phase: string
): number {
  let baseMultiplier = 1.375

  if (training_days_per_week >= 6) {
    baseMultiplier = 1.725
  } else if (training_days_per_week >= 5) {
    baseMultiplier = 1.65
  } else if (training_days_per_week >= 3) {
    baseMultiplier = 1.55
  } else if (training_days_per_week >= 1) {
    baseMultiplier = 1.375
  }

  // Sport-specific adjustments (modest)
  const highIntensitySports = ['football', 'rugby', 'hockey', 'basketball', 'soccer', 'lacrosse', 'wrestling']
  const enduranceSports = ['cross_country', 'track', 'swimming', 'rowing', 'cycling']

  const sportLower = sport.toLowerCase().replace(/\s+/g, '_')

  if (highIntensitySports.some(s => sportLower.includes(s))) {
    baseMultiplier *= 1.05
  } else if (enduranceSports.some(s => sportLower.includes(s))) {
    baseMultiplier *= 1.1
  }

  // Season phase adjustments
  if (season_phase === 'offseason') {
    baseMultiplier *= 0.95
  } else if (season_phase === 'preseason') {
    baseMultiplier *= 1.03
  } else if (season_phase === 'in_season') {
    baseMultiplier *= 1.05
  }

  return baseMultiplier
}

/**
 * Get protein recommendation in grams per POUND of body weight
 * Target range: 1.0-1.4 g/lb depending on goal
 */
function getProteinPerLb(goal_phase: string): number {
  const goal = goal_phase.toLowerCase()
  if (goal.includes('gain') || goal.includes('muscle') || goal.includes('lean_mass')) {
    return 1.3 // Higher end for muscle gain
  } else if (goal.includes('lose') || goal.includes('fat') || goal.includes('cut')) {
    return 1.4 // Highest for fat loss to preserve muscle
  } else if (goal.includes('recover') || goal.includes('rebuild')) {
    return 1.2 // Recovery phase
  } else {
    // maintain, in_season_maintenance, default
    return 1.1
  }
}

/**
 * Get position-specific caloric adjustment
 */
function getPositionAdjustment(sport: string, position?: string): number {
  if (!position) return 1.0

  const sport_lower = sport.toLowerCase()
  const position_lower = position.toLowerCase()

  if (sport_lower.includes('football')) {
    if (
      position_lower.includes('lineman') ||
      position_lower.includes('tackle') ||
      position_lower.includes('guard') ||
      position_lower.includes('center')
    ) {
      return 1.1
    }
    if (
      position_lower.includes('linebacker') ||
      position_lower.includes('defensive end')
    ) {
      return 1.05
    }
  }

  if (sport_lower.includes('rugby')) {
    if (position_lower.includes('prop') || position_lower.includes('hooker')) {
      return 1.1
    }
  }

  return 1.0
}

/**
 * Main recommendation function
 * 
 * Macro distribution strategy:
 * 1. Protein: 1.0-1.4 g per lb of body weight (set first, non-negotiable)
 * 2. Fat: 25% of total calories (floor of 0.35 g/lb for hormonal health)
 * 3. Carbs: remaining calories after protein and fat
 */
export function calculateNutritionRecommendation(
  athlete: AthleteProfile
): NutritionRecommendation {
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
  if (goalPhase.includes('gain') || goalPhase.includes('muscle') || goalPhase.includes('lean_mass')) {
    tdee += 300 // Modest surplus for lean gains
  } else if (goalPhase.includes('lose') || goalPhase.includes('fat') || goalPhase.includes('cut')) {
    tdee -= 300 // Modest deficit for fat loss
  }

  // Step 5: Apply position adjustment
  const positionAdjustment = getPositionAdjustment(athlete.sport, athlete.position)
  tdee *= positionAdjustment

  // Step 6: Calculate macros — PROTEIN FIRST approach
  const proteinPerLb = getProteinPerLb(athlete.goal_phase)
  const protein_g = Math.round(athlete.weight_lbs * proteinPerLb)
  const protein_cals = protein_g * 4

  // Fat: 25% of TDEE, with a minimum of 0.35g/lb for hormonal health
  const fat_from_pct = Math.round((tdee * 0.25) / 9)
  const fat_min = Math.round(athlete.weight_lbs * 0.35)
  const fat_g = Math.max(fat_from_pct, fat_min)
  const fat_cals = fat_g * 9

  // Carbs: remaining calories
  const remaining_cals = tdee - protein_cals - fat_cals
  const carbs_g = Math.max(Math.round(remaining_cals / 4), 100) // Floor of 100g carbs

  // Recalculate actual total calories from macros
  const totalCals = Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9)

  // Build methodology string
  const methodology = `
ISSN/IOC Evidence-Based Calculation:
- RMR (Mifflin-St Jeor): ${Math.round(rmr)} cal
- Activity Factor: ${activityMultiplier.toFixed(2)}x (${athlete.training_days_per_week} days/week)
- TDEE: ${Math.round(tdee)} cal
- Goal Adjustment: ${goalPhase.includes('gain') || goalPhase.includes('muscle') ? '+300' : goalPhase.includes('lose') || goalPhase.includes('fat') ? '-300' : '0'} cal
- Position Adjustment: ${(positionAdjustment * 100 - 100).toFixed(0)}%
- Protein: ${proteinPerLb.toFixed(1)}g/lb body weight (${athlete.goal_phase})
- Fat: 25% of TDEE (min 0.35g/lb)
- Carbs: Remaining calories
  `.trim()

  const notes = `
Based on ISSN Position Stands and IOC Consensus guidelines.
Protein target: ${proteinPerLb.toFixed(1)}g per pound of body weight.
${athlete.body_fat_percentage ? `Body Fat: ${athlete.body_fat_percentage}%` : 'Note: InBody scan would improve accuracy'}
${athlete.season_phase === 'in_season' ? 'In-season: Higher energy demands' : ''}
  `.trim()

  return {
    daily_calories: totalCals,
    daily_protein_g: protein_g,
    daily_carbs_g: carbs_g,
    daily_fat_g: fat_g,
    methodology,
    notes,
  }
}
