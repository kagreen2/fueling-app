// Quick test of the nutrition calculator

// Inline the functions since we can't import TS directly

function calculateRMR(weight_lbs, height_inches, age, sex) {
  const weight_kg = weight_lbs * 0.453592
  const height_cm = height_inches * 2.54
  if (sex === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  } else {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
  }
}

function getActivityMultiplier(training_days_per_week, sport, season_phase) {
  let baseMultiplier
  if (training_days_per_week >= 6) {
    baseMultiplier = 1.9
  } else if (training_days_per_week >= 5) {
    baseMultiplier = 1.725
  } else if (training_days_per_week >= 3) {
    baseMultiplier = 1.55
  } else if (training_days_per_week >= 1) {
    baseMultiplier = 1.375
  } else {
    baseMultiplier = 1.2
  }

  const highIntensitySports = ['football', 'rugby', 'hockey', 'basketball', 'soccer', 'lacrosse', 'wrestling', 'volleyball', 'tennis']
  const enduranceSports = ['cross_country', 'track', 'swimming', 'rowing', 'cycling', 'triathlon', 'distance_running']
  const sportLower = sport.toLowerCase().replace(/\s+/g, '_')

  if (highIntensitySports.some(s => sportLower.includes(s))) {
    baseMultiplier *= 1.10
  } else if (enduranceSports.some(s => sportLower.includes(s))) {
    baseMultiplier *= 1.15
  }

  if (season_phase === 'offseason') {
    baseMultiplier *= 0.92
  } else if (season_phase === 'preseason') {
    baseMultiplier *= 1.05
  } else if (season_phase === 'in_season') {
    baseMultiplier *= 1.08
  } else if (season_phase === 'postseason') {
    baseMultiplier *= 0.90
  }

  return baseMultiplier
}

function getProteinPerLb(goal_phase) {
  const goal = goal_phase.toLowerCase()
  if (goal.includes('gain') || goal.includes('muscle') || goal.includes('lean_mass')) return 1.3
  if (goal.includes('lose') || goal.includes('fat') || goal.includes('cut')) return 1.4
  if (goal.includes('recover') || goal.includes('rebuild')) return 1.2
  return 1.1
}

function getPositionAdjustment(sport, position) {
  return 1.0 // No specific softball position adjustment
}

function getYouthGrowthCalories(age) {
  if (age <= 13) return 400
  if (age <= 15) return 350
  if (age <= 17) return 250
  return 0
}

// TEST CASE: 16yo female softball player, maintain, in-season, 6 days/week (3 lifting + 3 games)
const athlete = {
  age: 16,
  sex: 'female',
  weight_lbs: 145,
  height_inches: 66,
  sport: 'softball',
  position: null,
  goal_phase: 'maintain_performance',
  training_days_per_week: 6, // 3 lifting + 3 games = 6 active days
  season_phase: 'in_season',
}

const rmr = calculateRMR(athlete.weight_lbs, athlete.height_inches, athlete.age, athlete.sex)
const activityMultiplier = getActivityMultiplier(athlete.training_days_per_week, athlete.sport, athlete.season_phase)
let tdee = rmr * activityMultiplier
const posAdj = getPositionAdjustment(athlete.sport, athlete.position)
tdee *= posAdj
const youthCals = getYouthGrowthCalories(athlete.age)
tdee += youthCals

// No goal adjustment for maintain
const proteinPerLb = getProteinPerLb(athlete.goal_phase)
const protein_g = Math.round(athlete.weight_lbs * proteinPerLb)
const protein_cals = protein_g * 4

const fat_from_pct = Math.round((tdee * 0.30) / 9)
const fat_min = Math.round(athlete.weight_lbs * 0.4)
const fat_g = Math.max(fat_from_pct, fat_min)
const fat_cals = fat_g * 9

const remaining_cals = tdee - protein_cals - fat_cals
const carbs_g = Math.max(Math.round(remaining_cals / 4), 100)
const totalCals = Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9)

console.log('=== 16yo Female Softball Player - Maintain Mass, In-Season ===')
console.log(`Weight: ${athlete.weight_lbs} lbs | Height: ${athlete.height_inches}" | Age: ${athlete.age}`)
console.log(`Sport: ${athlete.sport} | Season: ${athlete.season_phase} | Training: ${athlete.training_days_per_week} days/week`)
console.log(`Goal: ${athlete.goal_phase}`)
console.log('')
console.log('--- Calorie Calculation ---')
console.log(`RMR (Mifflin-St Jeor): ${Math.round(rmr)} cal`)
console.log(`Activity Multiplier: ${activityMultiplier.toFixed(3)}x`)
console.log(`Base TDEE (RMR × Activity): ${Math.round(rmr * activityMultiplier)} cal`)
console.log(`Position Adjustment: ${posAdj > 1 ? `+${((posAdj-1)*100).toFixed(0)}%` : 'None'}`)
console.log(`Youth Growth Factor: +${youthCals} cal`)
console.log(`Goal Adjustment: 0 cal (maintain)`)
console.log(`Final TDEE: ${Math.round(tdee)} cal`)
console.log('')
console.log('--- Macro Breakdown ---')
console.log(`Protein: ${proteinPerLb}g/lb × ${athlete.weight_lbs}lb = ${protein_g}g (${protein_cals} cal, ${((protein_cals/totalCals)*100).toFixed(1)}%)`)
console.log(`Fat: 30% of TDEE = ${fat_g}g (${fat_cals} cal, ${((fat_cals/totalCals)*100).toFixed(1)}%)`)
console.log(`Carbs: Remaining = ${carbs_g}g (${carbs_g*4} cal, ${((carbs_g*4/totalCals)*100).toFixed(1)}%)`)
console.log(`Total Calories: ${totalCals} cal`)
