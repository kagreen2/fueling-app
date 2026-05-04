/**
 * Evidence-Based Nutrition Calculator
 * Based on ISSN Position Stands, IOC Consensus Statement (2018), and NCAA Guidelines
 * 
 * KEY PRINCIPLES (Updated — "Protein & Carbs First" Approach):
 * 1. Protein: Set by GOAL PHASE (g/kg body weight) — ISSN Position Stand (Jäger et al., 2017)
 * 2. Carbs: Set by TRAINING VOLUME (g/kg body weight) — IOC/Burke et al. (2011, 2018)
 * 3. Fat: Fills remaining calories with a floor of 0.8 g/kg (hormonal health minimum)
 * 
 * Calorie calculation:
 * - TDEE = BMR × Activity Factor + Goal Adjustment + Youth Growth (athletes only)
 * - BMR source priority: InBody-measured (Katch-McArdle from FFM) > Mifflin-St Jeor estimate
 * 
 * Supports two user types:
 * - Athletes: Sport-specific multipliers, season phase, position adjustments, youth growth
 * - General Fitness: Activity-level and training-style based multipliers
 * 
 * References:
 * - ISSN Position Stand: Protein and Exercise (Jäger et al., 2017)
 * - ISSN Position Stand: Diets and Body Composition (Aragon et al., 2017)
 * - IOC Consensus Statement on Sports Nutrition (2011, updated 2018)
 * - Burke et al. Carbohydrate Periodization (2018)
 * - Hector & Phillips: Protein during energy restriction (2018)
 * - Helms et al.: Protein for physique athletes (2014)
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

  // Training style adjustments (supports multiple comma-separated styles)
  const styles = training_style.split(',').map(s => s.trim()).filter(Boolean)
  const styleMultipliers: Record<string, number> = {
    crossfit: 1.05,    // HIIT: High EPOC, CrossFit, bootcamps, functional fitness
    strength: 1.03,    // Elevated post-exercise metabolism
    cardio: 1.05,      // Sustained caloric burn
    mixed: 1.03,       // Moderate adjustment
    yoga_pilates: 1.0, // Lower metabolic demand
    dance: 1.04,       // Dance: moderate-to-high cardio demand
  }
  if (styles.length > 0) {
    // Average the multipliers for all selected styles
    const total = styles.reduce((sum, s) => sum + (styleMultipliers[s] || 1.0), 0)
    const avgMultiplier = total / styles.length
    baseMultiplier *= avgMultiplier
  }

  return baseMultiplier
}

/**
 * Get protein recommendation in g/kg body weight based on goal phase
 * 
 * Evidence-based ranges (ISSN Position Stand — Jäger et al., 2017):
 * - General exercising: 1.4–2.0 g/kg/day
 * - Muscle gain (caloric surplus): 1.6–2.2 g/kg/day
 * - Fat loss (caloric deficit): 2.0–2.4 g/kg/day (Hector & Phillips, 2018)
 * - Extreme deficit / contest prep: 2.3–3.1 g/kg/day (Helms et al., 2014)
 * - Recovery / rebuild: 1.8–2.2 g/kg/day
 * 
 * We use midpoints of each range for the recommendation.
 */
function getProteinPerKg(goal_phase: string): number {
  const goal = goal_phase.toLowerCase()
  if (goal.includes('gain') || goal.includes('muscle') || goal.includes('lean_mass')) {
    return 2.0  // Gain lean mass: 1.6-2.2 g/kg midpoint (surplus — MPS maximization)
  } else if (goal.includes('recover') || goal.includes('rebuild')) {
    return 2.0  // Recover & rebuild: 1.8-2.2 g/kg midpoint
  } else if (goal.includes('lose') || goal.includes('fat') || goal.includes('cut')) {
    return 2.2  // Lose body fat: 2.0-2.4 g/kg midpoint (preserve lean mass in deficit)
  } else {
    // maintain, in_season_maintenance, general performance
    return 1.8  // Maintain & perform: 1.4-2.0 g/kg upper midpoint (active athletes)
  }
}

/**
 * Get carbohydrate recommendation in g/kg body weight based on training volume
 * 
 * IOC/Burke et al. (2011, 2018) Carbohydrate Periodization Guidelines:
 * - Light activity (low intensity / skill-based, ≤3 days): 3–5 g/kg/day
 * - Moderate exercise (~1 hr/day, 3-5 days): 5–7 g/kg/day
 * - High volume (1-3 hr/day moderate-to-high, 5-6 days): 6–8 g/kg/day
 * - Very high (4-5+ hr/day extreme, 6-7 days): 8–10 g/kg/day
 * 
 * Additional adjustments for:
 * - Sport type (endurance sports need more carbs)
 * - Season phase (in-season competition demands more glycogen)
 * - Goal phase (deficit = lower carbs, surplus = higher carbs)
 */
function getCarbsPerKg(
  training_days_per_week: number,
  sport: string,
  season_phase: string,
  goal_phase: string,
  user_type: 'athlete' | 'member',
  training_style?: string
): number {
  let baseCarbsPerKg: number

  if (user_type === 'member') {
    // General fitness members — scale by training frequency
    if (training_days_per_week >= 6) {
      baseCarbsPerKg = 6.0  // Very active member
    } else if (training_days_per_week >= 5) {
      baseCarbsPerKg = 5.5
    } else if (training_days_per_week >= 3) {
      baseCarbsPerKg = 4.5  // Moderate
    } else if (training_days_per_week >= 1) {
      baseCarbsPerKg = 3.5  // Light
    } else {
      baseCarbsPerKg = 3.0  // Sedentary
    }

    // Training style adjustment for members
    if (training_style) {
      const styles = training_style.split(',').map(s => s.trim())
      if (styles.includes('crossfit') || styles.includes('cardio')) {
        baseCarbsPerKg += 0.5  // Higher glycolytic demand
      } else if (styles.includes('strength')) {
        baseCarbsPerKg += 0.0  // Strength training has moderate carb needs
      } else if (styles.includes('yoga_pilates')) {
        baseCarbsPerKg -= 0.5  // Lower glycolytic demand
      }
    }
  } else {
    // Athletes — scale by training frequency + sport type + season
    if (training_days_per_week >= 6) {
      baseCarbsPerKg = 7.0  // Very high volume athlete
    } else if (training_days_per_week >= 5) {
      baseCarbsPerKg = 6.0  // High volume
    } else if (training_days_per_week >= 3) {
      baseCarbsPerKg = 5.0  // Moderate volume
    } else if (training_days_per_week >= 1) {
      baseCarbsPerKg = 4.0  // Light / early offseason
    } else {
      baseCarbsPerKg = 3.5  // Rest / recovery period
    }

    // Sport-type carb adjustment (IOC Consensus)
    const sportLower = sport.toLowerCase().replace(/\s+/g, '_')
    const enduranceSports = [
      'cross_country', 'track', 'track_and_field', 'swimming', 'rowing', 'cycling',
      'triathlon', 'distance_running'
    ]
    const highIntensitySports = [
      'football', 'rugby', 'hockey', 'basketball', 'soccer',
      'lacrosse', 'wrestling', 'volleyball', 'tennis'
    ]

    if (enduranceSports.some(s => sportLower.includes(s))) {
      baseCarbsPerKg += 1.5  // Endurance athletes need significantly more glycogen
    } else if (highIntensitySports.some(s => sportLower.includes(s))) {
      baseCarbsPerKg += 0.5  // High-intensity intermittent sports: moderate increase
    }

    // Season phase carb periodization
    if (season_phase === 'in_season') {
      baseCarbsPerKg += 0.5  // Competition demands: higher glycogen needs
    } else if (season_phase === 'preseason') {
      baseCarbsPerKg += 0.3  // Ramping up training load
    } else if (season_phase === 'offseason') {
      baseCarbsPerKg -= 0.5  // Lower training volume
    } else if (season_phase === 'postseason') {
      baseCarbsPerKg -= 0.5  // Active recovery
    }
  }

  // Goal phase carb adjustment
  const goal = goal_phase.toLowerCase()
  if (goal.includes('lose') || goal.includes('fat') || goal.includes('cut')) {
    baseCarbsPerKg -= 1.0  // Reduce carbs in deficit (protein stays high to preserve muscle)
  } else if (goal.includes('gain') || goal.includes('muscle') || goal.includes('lean_mass')) {
    baseCarbsPerKg += 0.5  // Slightly more carbs to fuel hypertrophy training
  }

  // Floor: minimum 3.0 g/kg for any active person (brain function + basic training fuel)
  // Ceiling: cap at 10 g/kg (IOC max for extreme endurance)
  return Math.max(3.0, Math.min(baseCarbsPerKg, 10.0))
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
 * NEW "Protein & Carbs First" macro distribution strategy:
 * 1. Calculate TDEE (BMR × Activity Factor + adjustments)
 * 2. Set Protein: g/kg based on goal phase (ISSN — Jäger et al., 2017)
 * 3. Set Carbs: g/kg based on training volume (IOC — Burke et al., 2018)
 * 4. Set Fat: remaining calories, with a floor of 0.8 g/kg (~20% minimum for hormonal health)
 * 5. If protein + carbs + fat floor > TDEE, scale carbs down slightly to fit
 * 
 * Calorie calculation:
 * Athletes: TDEE = RMR × Activity Factor × Position Adjustment + Youth Growth + Goal Adjustment
 * Members:  TDEE = RMR × Activity Factor + Goal Adjustment
 */
export function calculateNutritionRecommendation(
  athlete: AthleteProfile
): NutritionRecommendation {
  const isAthlete = athlete.user_type !== 'member'
  const weight_kg = athlete.weight_lbs * 0.453592

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
  const rmrSource = athlete.inbody_bmr && athlete.inbody_bmr > 0 ? 'InBody measured (Katch-McArdle)' : 'Mifflin-St Jeor estimate'

  // Step 2: Apply activity multiplier to get TDEE
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

  // Step 5: Adjust for goal phase (caloric surplus/deficit)
  const goalPhase = athlete.goal_phase.toLowerCase()
  let goalAdjustmentCals = 0
  if (goalPhase.includes('gain') || goalPhase.includes('muscle') || goalPhase.includes('lean_mass')) {
    goalAdjustmentCals = 400  // Caloric surplus for lean mass gain
  } else if (goalPhase.includes('lose') || goalPhase.includes('fat') || goalPhase.includes('cut')) {
    goalAdjustmentCals = -300  // Moderate deficit to preserve muscle
  }
  tdee += goalAdjustmentCals

  // Step 6: Calculate macros — PROTEIN & CARBS FIRST approach

  // Protein: g/kg based on goal phase (ISSN)
  const proteinPerKg = getProteinPerKg(athlete.goal_phase)
  const protein_g = Math.round(weight_kg * proteinPerKg)
  const protein_cals = protein_g * 4

  // Carbs: g/kg based on training volume (IOC/Burke)
  const carbsPerKg = getCarbsPerKg(
    athlete.training_days_per_week,
    athlete.sport,
    athlete.season_phase,
    athlete.goal_phase,
    isAthlete ? 'athlete' : 'member',
    athlete.training_style
  )
  let carbs_g = Math.round(weight_kg * carbsPerKg)
  let carbs_cals = carbs_g * 4

  // Fat: remaining calories with a floor of 0.8 g/kg (hormonal health minimum)
  const fatFloorGrams = Math.round(weight_kg * 0.8)
  const fatFloorCals = fatFloorGrams * 9
  let remaining_cals = tdee - protein_cals - carbs_cals
  let fat_g: number

  if (remaining_cals >= fatFloorCals) {
    // Enough room — fat fills the remainder
    fat_g = Math.round(remaining_cals / 9)
  } else {
    // Not enough room — set fat to floor and scale carbs down to fit
    fat_g = fatFloorGrams
    const available_for_carbs = tdee - protein_cals - fatFloorCals
    if (available_for_carbs > 0) {
      carbs_g = Math.round(available_for_carbs / 4)
    } else {
      // Extreme deficit scenario — keep minimum carbs for brain function (100g)
      carbs_g = Math.max(100, Math.round(available_for_carbs / 4))
    }
    carbs_cals = carbs_g * 4
  }

  // Ensure fat doesn't exceed 35% of total calories (cap for health)
  const maxFatFromPct = Math.round((tdee * 0.35) / 9)
  if (fat_g > maxFatFromPct) {
    fat_g = maxFatFromPct
  }

  // Ensure minimum carbs of 100g (brain function)
  carbs_g = Math.max(carbs_g, 100)

  // Recalculate actual total calories from macros
  const totalCals = Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9)

  // Build methodology string
  const goalAdjustmentStr = goalAdjustmentCals > 0 ? `+${goalAdjustmentCals}` : `${goalAdjustmentCals}`
  const proteinPerLb = (proteinPerKg * 0.453592).toFixed(2) // for display in familiar units

  let methodology: string
  if (isAthlete) {
    methodology = `
ISSN/IOC Evidence-Based Calculation (Athlete — Protein & Carbs First):
- BMR (${rmrSource}): ${Math.round(rmr)} cal${athlete.inbody_bmr && athlete.inbody_bmr > 0 ? ` (Mifflin-St Jeor estimate was ${Math.round(estimatedRmr)} cal)` : ''}
- Activity Factor: ${activityMultiplier.toFixed(2)}x (${activityDescription})
- Base TDEE: ${Math.round(rmr * activityMultiplier)} cal
- Position Adjustment: ${positionAdjustment > 1 ? `+${((positionAdjustment - 1) * 100).toFixed(0)}%` : 'None'}
- Youth Growth Factor: ${youthCalories > 0 ? `+${youthCalories} cal` : 'N/A (adult)'}
- Goal Adjustment: ${goalAdjustmentStr} cal (${athlete.goal_phase})
- Final TDEE: ${Math.round(tdee)} cal
- Protein: ${proteinPerKg.toFixed(1)} g/kg × ${weight_kg.toFixed(1)}kg = ${protein_g}g (${Math.round(protein_cals)} cal)
- Carbs: ${carbsPerKg.toFixed(1)} g/kg × ${weight_kg.toFixed(1)}kg = ${carbs_g}g (${carbs_g * 4} cal) [based on ${athlete.training_days_per_week} training days/week]
- Fat: Remainder = ${fat_g}g (${fat_g * 9} cal) [floor: ${fatFloorGrams}g = 0.8 g/kg]
    `.trim()
  } else {
    methodology = `
ISSN/IOC Evidence-Based Calculation (General Fitness — Protein & Carbs First):
- BMR (${rmrSource}): ${Math.round(rmr)} cal${athlete.inbody_bmr && athlete.inbody_bmr > 0 ? ` (Mifflin-St Jeor estimate was ${Math.round(estimatedRmr)} cal)` : ''}
- Activity Factor: ${activityMultiplier.toFixed(2)}x (${activityDescription})
- Base TDEE: ${Math.round(rmr * activityMultiplier)} cal
- Goal Adjustment: ${goalAdjustmentStr} cal (${athlete.goal_phase})
- Final TDEE: ${Math.round(tdee)} cal
- Protein: ${proteinPerKg.toFixed(1)} g/kg × ${weight_kg.toFixed(1)}kg = ${protein_g}g (${Math.round(protein_cals)} cal)
- Carbs: ${carbsPerKg.toFixed(1)} g/kg × ${weight_kg.toFixed(1)}kg = ${carbs_g}g (${carbs_g * 4} cal) [based on ${athlete.training_days_per_week} training days/week, ${athlete.training_style || 'mixed'} style]
- Fat: Remainder = ${fat_g}g (${fat_g * 9} cal) [floor: ${fatFloorGrams}g = 0.8 g/kg]
    `.trim()
  }

  let notes: string
  if (isAthlete) {
    notes = `
Based on ISSN Position Stands (Jäger 2017, Aragon 2017) and IOC Consensus (Burke 2018).
Protein: ${proteinPerKg.toFixed(1)} g/kg/day — set by goal phase (${athlete.goal_phase}).
Carbs: ${carbsPerKg.toFixed(1)} g/kg/day — set by training volume (${athlete.training_days_per_week} days/week, ${athlete.sport}, ${athlete.season_phase}).
Fat: ${fat_g}g/day — fills remaining calories (min 0.8 g/kg for hormonal health).
${youthCalories > 0 ? `Youth athlete: +${youthCalories} cal added for growth and development.` : ''}
${athlete.body_fat_percentage ? `Body Fat: ${athlete.body_fat_percentage}%` : 'Note: InBody scan would improve accuracy.'}
${athlete.inbody_bmr ? `Using InBody measured BMR (${athlete.inbody_bmr} kcal) for higher accuracy.` : 'Tip: An InBody scan can provide a measured BMR for more accurate calculations.'}
${athlete.season_phase === 'in_season' ? 'In-season: Elevated carb needs for competition + practice glycogen demands.' : ''}
    `.trim()
  } else {
    notes = `
Based on ISSN Position Stands (Jäger 2017, Aragon 2017) and IOC Consensus (Burke 2018).
Protein: ${proteinPerKg.toFixed(1)} g/kg/day — set by goal phase (${athlete.goal_phase}).
Carbs: ${carbsPerKg.toFixed(1)} g/kg/day — set by training volume (${athlete.training_days_per_week} days/week, ${athlete.training_style || 'mixed'} style).
Fat: ${fat_g}g/day — fills remaining calories (min 0.8 g/kg for hormonal health).
Activity level: ${athlete.activity_level || 'moderately active'} | Training style: ${athlete.training_style || 'mixed'}
${athlete.body_fat_percentage ? `Body Fat: ${athlete.body_fat_percentage}%` : 'Note: InBody scan would improve accuracy.'}
${athlete.inbody_bmr ? `Using InBody measured BMR (${athlete.inbody_bmr} kcal) for higher accuracy.` : 'Tip: An InBody scan can provide a measured BMR for more accurate calculations.'}
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
