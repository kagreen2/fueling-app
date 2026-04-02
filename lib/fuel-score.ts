/**
 * Fuel Score v2 Calculator
 * 
 * Calculates a 0-100 wellness + nutrition score from check-in data and meal logs.
 * 
 * Components:
 * - Check-in wellness (85% when nutrition data exists, 100% when it doesn't):
 *   Sleep 23.5%, Stress 23.5%, Energy 17.5%, Soreness 17.5%, Hydration 12%, Hunger 6%
 * - Nutrition compliance (15% when data exists):
 *   Logging behavior (40% of nutrition) + Target proximity (60% of nutrition)
 */

interface CheckinInputs {
  sleep: number       // 1-10 (how rested)
  stress: number      // 1-10 (higher = more stressed)
  energy: number      // 1-10 (higher = more energy)
  soreness: number    // 1-10 (higher = more sore)
  hydration: number   // 1-10 (higher = better hydrated)
  hunger: number      // 1-10 (higher = more hungry)
}

interface NutritionData {
  mealsLogged: number
  todayCalories: number
  todayProtein: number
  calorieGoal: number
  proteinGoal: number
}

/**
 * Calculate the check-in wellness component (normalized 0-1)
 */
function calculateWellnessComponent(inputs: CheckinInputs): number {
  const sleepNorm = (inputs.sleep - 1) / 9
  const stressNorm = (10 - inputs.stress) / 9
  const energyNorm = (inputs.energy - 1) / 9
  const sorenessNorm = (10 - inputs.soreness) / 9
  const hydrationNorm = (inputs.hydration - 1) / 9
  const hungerNorm = (10 - inputs.hunger) / 9

  return (
    sleepNorm * 0.235 +
    stressNorm * 0.235 +
    energyNorm * 0.175 +
    sorenessNorm * 0.175 +
    hydrationNorm * 0.12 +
    hungerNorm * 0.06
  )
}

/**
 * Calculate the nutrition compliance component (normalized 0-1)
 * 
 * Split into:
 * - Logging behavior (40%): rewards the habit of logging meals
 * - Target proximity (60%): how close to calorie and protein targets
 */
function calculateNutritionComponent(nutrition: NutritionData): number {
  // Logging behavior: 0 meals = 0, 1 = 0.5, 2 = 0.75, 3+ = 1.0
  let loggingScore: number
  if (nutrition.mealsLogged === 0) loggingScore = 0
  else if (nutrition.mealsLogged === 1) loggingScore = 0.5
  else if (nutrition.mealsLogged === 2) loggingScore = 0.75
  else loggingScore = 1.0

  // Target proximity: how close to calorie and protein goals
  // Sweet spot is 80-110% of target = perfect score
  // Below 50% or above 150% = 0
  let targetScore = 0

  if (nutrition.calorieGoal > 0 && nutrition.proteinGoal > 0) {
    const calRatio = nutrition.todayCalories / nutrition.calorieGoal
    const proRatio = nutrition.todayProtein / nutrition.proteinGoal

    const calScore = getProximityScore(calRatio)
    const proScore = getProximityScore(proRatio)

    // Calories 50%, Protein 50% of target score
    targetScore = calScore * 0.5 + proScore * 0.5
  } else if (nutrition.calorieGoal > 0) {
    // Only calorie goal set
    targetScore = getProximityScore(nutrition.todayCalories / nutrition.calorieGoal)
  } else {
    // No goals set — only use logging behavior
    return loggingScore
  }

  // Logging 40%, Target proximity 60%
  return loggingScore * 0.4 + targetScore * 0.6
}

/**
 * Score how close a ratio is to the ideal range (0.8 - 1.1)
 * Returns 0-1 where 1 = perfect (within 80-110% of target)
 */
function getProximityScore(ratio: number): number {
  if (ratio >= 0.8 && ratio <= 1.1) return 1.0      // Sweet spot
  if (ratio >= 0.6 && ratio < 0.8) return 0.7        // Slightly under
  if (ratio > 1.1 && ratio <= 1.3) return 0.7        // Slightly over
  if (ratio >= 0.4 && ratio < 0.6) return 0.4        // Significantly under
  if (ratio > 1.3 && ratio <= 1.5) return 0.4        // Significantly over
  if (ratio < 0.4) return 0.1                         // Way under
  return 0.1                                           // Way over (>150%)
}

/**
 * Calculate the full Fuel Score (0-100)
 * 
 * If nutrition data is available and athlete has goals:
 *   Score = (wellness × 0.85 + nutrition × 0.15) × 100
 * 
 * If no nutrition data or no goals:
 *   Score = wellness × 100 (check-in only)
 */
export function calculateFuelScore(
  checkin: CheckinInputs,
  nutrition?: NutritionData | null
): number {
  const wellnessComponent = calculateWellnessComponent(checkin)

  // If no nutrition data or no goals set, use check-in only
  if (!nutrition || (nutrition.calorieGoal === 0 && nutrition.proteinGoal === 0)) {
    return Math.round(wellnessComponent * 100)
  }

  const nutritionComponent = calculateNutritionComponent(nutrition)

  // Blend: 85% wellness, 15% nutrition
  const finalScore = wellnessComponent * 0.85 + nutritionComponent * 0.15
  return Math.round(finalScore * 100)
}

/**
 * Calculate just the check-in portion (for use at check-in time before meals are logged)
 * This is the same as calculateFuelScore without nutrition data.
 */
export function calculateCheckinScore(checkin: CheckinInputs): number {
  return Math.round(calculateWellnessComponent(checkin) * 100)
}

/**
 * Get the nutrition component score separately (for display purposes)
 * Returns 0-100
 */
export function getNutritionScore(nutrition: NutritionData): number {
  return Math.round(calculateNutritionComponent(nutrition) * 100)
}
