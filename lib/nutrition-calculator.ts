/**
 * Evidence-Based Nutrition Calculator
 * Based on ISSN Position Stands, IOC Consensus Statement, and NCAA Guidelines
 * 
 * KEY PRINCIPLES:
 * - Protein: 1.0-1.4 g per POUND of body weight
 * - Fat: 30% of total calories (hormonal health, joint support, satiety)
 * - Carbs: Remaining calories (fueling training & recovery)
 * - Activity level significantly impacts TDEE via ISSN/IOC activity factors
 * - Youth athletes (under 18) get a growth factor adjustment
 * 
 * Supports two user types:
 * - Athletes: Sport-specific multipliers, season phase, position adjustments, youth growth
 * - General Fitness: Activity-level and training-style based multipliers
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
  /** InBody-measured BMR — when available, used instead of Mifflin-St Jeor estimate */
  inbody_bmr?: number
  /** User type — 'athlete' or 'member' */
  user_type?: 'athlete' | 'member'
  /** Activity level for general members */
  activity_level?: string
  /** Training style for general members */
  training_style?: string
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
 * Most validated equation for athletes (ISSN Position Stand)
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
 * Get activity multiplier for ATHLETES based on training frequency, sport type, and season
 * 
 * References:
 * - ISSN Position Stand on Diets and Body Composition (2017)
 * - IOC Consensus Statement on Sports Nutrition (2011, updated 2018)
 * - Activity factors aligned with Harris-Benedict / ISSN ranges:
 *   Sedentary: 1.2, Light (1-2d): 1.375, Moderate (3-4d): 1.55,
 *   Active (5-6d): 1.725, Very Active (6-7d intense): 1.9
 * 
 * Sport-specific multipliers account for training intensity and metabolic demands
 * Season phase adjustments reflect periodized energy needs
 */
function getAthleteActivityMultiplier(
  training_days_per_week: number,
  sport: string,
  season_phase: string
): number {
  // ISSN/IOC aligned base activity factors
  let baseMultiplier: number

  if (training_days_per_week >= 6) {
    baseMultiplier = 1.9   // Very active: intense training 6-7 days/week
  } else if (training_days_per_week >= 5) {
    baseMultiplier = 1.725 // Active: hard training 5-6 days/week
  } else if (training_days_per_week >= 3) {
    baseMultiplier = 1.55  // Moderate: training 3-4 days/week
  } else if (training_days_per_week >= 1) {
    baseMultiplier = 1.375 // Light: training 1-2 days/week
  } else {
    baseMultiplier = 1.2   // Sedentary
  }

  // Sport-specific intensity adjustments (IOC Consensus)
  const highIntensitySports = [
    'football', 'rugby', 'hockey', 'basketball', 'soccer',
    'lacrosse', 'wrestling', 'volleyball', 'tennis'
  ]
  const enduranceSports = [
    'cross_country', 'track', 'track_and_field', 'swimming', 'rowing', 'cycling',
    'triathlon', 'distance_running'
  ]

  const sportLower = sport.toLowerCase().replace(/\s+/g, '_')

  if (highIntensitySports.some(s => sportLower.includes(s))) {
    baseMultiplier *= 1.10  // +10% for high-intensity intermittent sports
  } else if (enduranceSports.some(s => sportLower.includes(s))) {
    baseMultiplier *= 1.15  // +15% for endurance sports
  }

  // Season phase periodization adjustments
  if (season_phase === 'offseason') {
    baseMultiplier *= 0.92  // Lower training volume/intensity
  } else if (season_phase === 'preseason') {
    baseMultiplier *= 1.05  // Ramping up training load
  } else if (season_phase === 'in_season') {
    baseMultiplier *= 1.08  // Competition + practice demands
  } else if (season_phase === 'postseason') {
    baseMultiplier *= 0.90  // Active recovery
  }

  return baseMultiplier
}

/**
 * Get activity multiplier for GENERAL MEMBERS based on activity level and training style
 * 
 * Uses standard ISSN activity factors with training-style adjustments:
 * - CrossFit/Functional: +5% (high EPOC, mixed modality)
 * - Strength Training: +3% (elevated post-exercise metabolism)
 * - Cardio/Endurance: +5% (sustained caloric burn)
 * - Yoga/Pilates: no adjustment (lower metabolic demand)
 */
function getMemberActivityMultiplier(
  activity_level: string,
  training_style: string,
  training_days_per_week: number
): number {
  // Base multiplier from activity level
  let baseMultiplier: number

  switch (activity_level) {
    case 'sedentary':
      baseMultiplier = 1.2
      break
    case 'lightly_active':
      baseMultiplier = 1.375
      break
    case 'moderately_active':
      baseMultiplier = 1.55
      break
    case 'very_active':
      baseMultiplier = 1.725
      break
    case 'extremely_active':
      baseMultiplier = 1.9
      break
    default:
      // Fallback: derive from training days if activity level not set
      if (training_days_per_week >= 6) baseMultiplier = 1.9
      else if (training_days_per_week >= 5) baseMultiplier = 1.725
      else if (training_days_per_week >= 3) baseMultiplier = 1.55
      else if (training_days_per_week >= 1) baseMultiplier = 1.375
      else baseMultiplier = 1.2
  }

  // Training style adjustments
  switch (training_style) {
    case 'crossfit':
      baseMultiplier *= 1.05  // HIIT: High EPOC, CrossFit, bootcamps, functional fitness
      break
    case 'strength':
      baseMultiplier *= 1.03  // Elevated post-exercise metabolism
      break
    case 'cardio':
      baseMultiplier *= 1.05  // Sustained caloric burn
      break
    case 'mixed':
      baseMultiplier *= 1.03  // Moderate adjustment
      break
    case 'yoga_pilates':
      // No adjustment — lower metabolic demand
      break
    case 'dance':
      baseMultiplier *= 1.04  // Dance: moderate-to-high cardio demand, sustained movement
      break
  }

  return baseMultiplier
}

/**
 * Get protein recommendation in grams per POUND of body weight
 * 
 * Fuel Different Protocol:
 * - Gain lean mass: 1.2-1.4 g/lb (using 1.3 midpoint)
 * - Lose body fat: 1.0-1.2 g/lb (using 1.1 midpoint)
 * - Maintain & perform: 1.0-1.2 g/lb (using 1.1 midpoint)
 * - In-season maintenance: 1.0-1.2 g/lb (using 1.1 midpoint)
 * - Recover & rebuild: 1.2-1.4 g/lb (using 1.3 midpoint)
 */
function getProteinPerLb(goal_phase: string): number {
  const goal = goal_phase.toLowerCase()
  if (goal.includes('gain') || goal.includes('muscle') || goal.includes('lean_mass')) {
    return 1.3  // Gain lean mass: 1.2-1.4 g/lb
  } else if (goal.includes('recover') || goal.includes('rebuild')) {
    return 1.3  // Recover & rebuild: 1.2-1.4 g/lb
  } else if (goal.includes('lose') || goal.includes('fat') || goal.includes('cut')) {
    return 1.1  // Lose body fat: 1.0-1.2 g/lb
  } else {
    // maintain, in_season_maintenance, default
    return 1.1  // Maintain & perform / In-season maintenance: 1.0-1.2 g/lb
  }
}

/**
 * Get position-specific caloric adjustment (athletes only)
 * Accounts for body size demands and positional energy expenditure
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
      return 1.12  // Linemen: larger body mass, higher absolute energy needs
    }
    if (
      position_lower.includes('linebacker') ||
      position_lower.includes('defensive end') ||
      position_lower.includes('tight end')
    ) {
      return 1.07  // Hybrid positions: size + speed demands
    }
  }

  // Rugby position adjustments
  if (sport_lower.includes('rugby')) {
    if (position_lower.includes('prop') || position_lower.includes('hooker') || position_lower.includes('lock')) {
      return 1.10  // Forwards: higher body mass demands
    }
  }

  // Basketball: bigs vs guards
  if (sport_lower.includes('basketball')) {
    if (position_lower.includes('center') || position_lower.includes('power forward')) {
      return 1.05  // Post players: more physical play
    }
  }

  return 1.0
}

/**
 * Youth growth factor for athletes under 18
 * Growing athletes need additional calories to support development
 * IOC Youth Athlete Consensus (2015): additional 200-500 cal depending on age
 */
function getYouthGrowthCalories(age: number): number {
  if (age <= 13) return 400      // Peak growth period
  if (age <= 15) return 350      // Active growth
  if (age <= 17) return 250      // Late adolescent growth
  return 0                        // Adult
}

/**
 * Main recommendation function
 * 
 * Macro distribution strategy (protein-first approach):
 * 1. Protein: 1.0-1.4 g per lb of body weight (non-negotiable, set first)
 * 2. Fat: 30% of total calories (hormonal health, joint support, essential fatty acids)
 * 3. Carbs: remaining calories (primary training fuel)
 * 
 * Calorie calculation:
 * Athletes: TDEE = RMR × Activity Factor + Goal Adjustment + Youth Growth Factor + Position Adjustment
 * Members:  TDEE = RMR × Activity Factor + Goal Adjustment
 */
export function calculateNutritionRecommendation(
  athlete: AthleteProfile
): NutritionRecommendation {
  const isAthlete = athlete.user_type !== 'member'

  // Step 1: Calculate RMR
  // If an InBody-measured BMR is available, use it (more accurate than any formula).
  // Otherwise fall back to Mifflin-St Jeor estimation.
  const estimatedRmr = calculateRMR(
    athlete.weight_lbs,
    athlete.height_inches,
    athlete.age,
    athlete.sex
  )
  const rmr = athlete.inbody_bmr && athlete.inbody_bmr > 0 ? athlete.inbody_bmr : estimatedRmr
  const rmrSource = athlete.inbody_bmr && athlete.inbody_bmr > 0 ? 'InBody 580 measured' : 'Mifflin-St Jeor estimate'

  // Step 2: Apply activity multiplier
  let activityMultiplier: number
  let activityDescription: string

  if (isAthlete) {
    activityMultiplier = getAthleteActivityMultiplier(
      athlete.training_days_per_week,
      athlete.sport,
      athlete.season_phase
    )
    activityDescription = `${athlete.training_days_per_week} days/week, ${athlete.sport || 'general'}, ${athlete.season_phase || 'offseason'}`
  } else {
    activityMultiplier = getMemberActivityMultiplier(
      athlete.activity_level || 'moderately_active',
      athlete.training_style || 'mixed',
      athlete.training_days_per_week
    )
    activityDescription = `${athlete.activity_level || 'moderately active'}, ${athlete.training_style || 'mixed'} training, ${athlete.training_days_per_week} days/week`
  }

  let tdee = rmr * activityMultiplier

  // Step 3: Apply position-specific adjustment (athletes only)
  let positionAdjustment = 1.0
  if (isAthlete) {
    positionAdjustment = getPositionAdjustment(athlete.sport, athlete.position)
    tdee *= positionAdjustment
  }

  // Step 4: Add youth growth calories (athletes only — members are assumed adult)
  let youthCalories = 0
  if (isAthlete) {
    youthCalories = getYouthGrowthCalories(athlete.age)
    tdee += youthCalories
  }

  // Step 5: Adjust for goal phase
  const goalPhase = athlete.goal_phase.toLowerCase()
  let goalAdjustmentCals = 0
  if (goalPhase.includes('gain') || goalPhase.includes('muscle') || goalPhase.includes('lean_mass')) {
    goalAdjustmentCals = 400  // Caloric surplus for lean mass gain
  } else if (goalPhase.includes('lose') || goalPhase.includes('fat') || goalPhase.includes('cut')) {
    goalAdjustmentCals = -300  // Moderate deficit to preserve muscle
  }
  tdee += goalAdjustmentCals

  // Step 6: Calculate macros — PROTEIN FIRST approach
  const proteinPerLb = getProteinPerLb(athlete.goal_phase)
  const protein_g = Math.round(athlete.weight_lbs * proteinPerLb)
  const protein_cals = protein_g * 4

  // Fat: 30% of TDEE (minimum 0.4g/lb for hormonal health)
  const fat_from_pct = Math.round((tdee * 0.30) / 9)
  const fat_min = Math.round(athlete.weight_lbs * 0.4)
  const fat_g = Math.max(fat_from_pct, fat_min)
  const fat_cals = fat_g * 9

  // Carbs: remaining calories after protein and fat
  const remaining_cals = tdee - protein_cals - fat_cals
  const carbs_g = Math.max(Math.round(remaining_cals / 4), 100) // Floor of 100g carbs minimum

  // Recalculate actual total calories from macros
  const totalCals = Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9)

  // Build methodology string
  const goalAdjustmentStr = goalAdjustmentCals > 0 ? `+${goalAdjustmentCals}` : `${goalAdjustmentCals}`

  let methodology: string
  if (isAthlete) {
    methodology = `
ISSN/IOC Evidence-Based Calculation (Athlete):
- RMR (${rmrSource}): ${Math.round(rmr)} cal${athlete.inbody_bmr && athlete.inbody_bmr > 0 ? ` (Mifflin-St Jeor estimate was ${Math.round(estimatedRmr)} cal)` : ''}
- Activity Factor: ${activityMultiplier.toFixed(2)}x (${activityDescription})
- Base TDEE: ${Math.round(rmr * activityMultiplier)} cal
- Position Adjustment: ${positionAdjustment > 1 ? `+${((positionAdjustment - 1) * 100).toFixed(0)}%` : 'None'}
- Youth Growth Factor: ${youthCalories > 0 ? `+${youthCalories} cal` : 'N/A (adult)'}
- Goal Adjustment: ${goalAdjustmentStr} cal (${athlete.goal_phase})
- Final TDEE: ${Math.round(tdee)} cal
- Protein: ${proteinPerLb.toFixed(1)}g/lb × ${athlete.weight_lbs}lb = ${protein_g}g
- Fat: 30% of TDEE = ${fat_g}g
- Carbs: Remaining = ${carbs_g}g
    `.trim()
  } else {
    methodology = `
ISSN Evidence-Based Calculation (General Fitness):
- RMR (${rmrSource}): ${Math.round(rmr)} cal${athlete.inbody_bmr && athlete.inbody_bmr > 0 ? ` (Mifflin-St Jeor estimate was ${Math.round(estimatedRmr)} cal)` : ''}
- Activity Factor: ${activityMultiplier.toFixed(2)}x (${activityDescription})
- Base TDEE: ${Math.round(rmr * activityMultiplier)} cal
- Goal Adjustment: ${goalAdjustmentStr} cal (${athlete.goal_phase})
- Final TDEE: ${Math.round(tdee)} cal
- Protein: ${proteinPerLb.toFixed(1)}g/lb × ${athlete.weight_lbs}lb = ${protein_g}g
- Fat: 30% of TDEE = ${fat_g}g
- Carbs: Remaining = ${carbs_g}g
    `.trim()
  }

  let notes: string
  if (isAthlete) {
    notes = `
Based on ISSN Position Stands and IOC Consensus guidelines.
Protein target: ${proteinPerLb.toFixed(1)}g per pound of body weight.
Fat: 30% of total calories for hormonal health and essential fatty acids.
Carbs: Primary fuel source for training and recovery.
${youthCalories > 0 ? `Youth athlete: +${youthCalories} cal added for growth and development.` : ''}
${athlete.body_fat_percentage ? `Body Fat: ${athlete.body_fat_percentage}%` : 'Note: InBody scan would improve accuracy.'}
${athlete.inbody_bmr ? `Using InBody 580 measured BMR (${athlete.inbody_bmr} kcal) for higher accuracy.` : 'Tip: An InBody scan can provide a measured BMR for more accurate calculations.'}
${athlete.season_phase === 'in_season' ? 'In-season: Elevated energy demands from competition + practice.' : ''}
    `.trim()
  } else {
    notes = `
Based on ISSN Position Stands for general fitness populations.
Protein target: ${proteinPerLb.toFixed(1)}g per pound of body weight.
Fat: 30% of total calories for hormonal health and essential fatty acids.
Carbs: Primary fuel source for training and recovery.
Activity level: ${athlete.activity_level || 'moderately active'} | Training style: ${athlete.training_style || 'mixed'}
${athlete.body_fat_percentage ? `Body Fat: ${athlete.body_fat_percentage}%` : 'Note: InBody scan would improve accuracy.'}
${athlete.inbody_bmr ? `Using InBody 580 measured BMR (${athlete.inbody_bmr} kcal) for higher accuracy.` : 'Tip: An InBody scan can provide a measured BMR for more accurate calculations.'}
    `.trim()
  }

  return {
    daily_calories: totalCals,
    daily_protein_g: protein_g,
    daily_carbs_g: carbs_g,
    daily_fat_g: fat_g,
    methodology,
    notes,
  }
}
