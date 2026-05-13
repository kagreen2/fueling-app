/**
 * Menstrual Cycle Tracker Utility
 * 
 * Provides cycle phase calculation, macro adjustment factors, and display helpers.
 * 
 * Phases (based on a typical 28-day cycle, adjusted for user's actual cycle length):
 * 1. Menstrual (Days 1-5): Period — moderate metabolism, focus on iron-rich foods
 * 2. Follicular (Days 6-13): Rising estrogen — higher carb tolerance, peak performance
 * 3. Ovulatory (Days 14-16): Peak estrogen — highest energy, best training window
 * 4. Luteal (Days 17-28): Rising progesterone — BMR +100-300 cal, increased fat oxidation
 * 
 * References:
 * - Webb (1986): BMR variation across menstrual cycle
 * - Bisdee et al. (1989): Energy expenditure and menstrual cycle
 * - Oosthuyse & Bosch (2010): Effect of menstrual cycle on exercise metabolism
 * - McNulty et al. (2020): Menstrual cycle and exercise performance meta-analysis
 */

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown'

export interface CyclePhaseInfo {
  phase: CyclePhase
  dayOfCycle: number
  daysUntilNextPeriod: number
  label: string
  emoji: string
  color: string
  bgColor: string
  borderColor: string
  description: string
  nutritionTip: string
}

/**
 * Calculate the current cycle phase based on last period start date and cycle length
 */
export function getCyclePhase(
  lastPeriodStart: string | Date,
  cycleLength: number = 28
): CyclePhaseInfo {
  const start = new Date(lastPeriodStart)
  const today = new Date()
  
  // Reset time components for accurate day calculation
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  const diffMs = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  // Calculate current day in cycle (1-indexed, wraps around)
  const dayOfCycle = ((diffDays % cycleLength) + cycleLength) % cycleLength + 1
  const daysUntilNextPeriod = cycleLength - dayOfCycle + 1
  
  // Phase boundaries scaled to cycle length
  const menstrualEnd = Math.round(cycleLength * 5 / 28)        // ~5 days
  const follicularEnd = Math.round(cycleLength * 13 / 28)      // ~13 days
  const ovulatoryEnd = Math.round(cycleLength * 16 / 28)       // ~16 days
  // Luteal: ovulatoryEnd+1 through cycleLength
  
  let phase: CyclePhase
  let label: string
  let emoji: string
  let color: string
  let bgColor: string
  let borderColor: string
  let description: string
  let nutritionTip: string
  
  if (dayOfCycle <= menstrualEnd) {
    phase = 'menstrual'
    label = 'Menstrual'
    emoji = '🔴'
    color = 'text-red-400'
    bgColor = 'bg-red-500/10'
    borderColor = 'border-red-500/30'
    description = 'Period phase — energy may be lower, focus on recovery'
    nutritionTip = 'Focus on iron-rich foods (red meat, spinach, lentils). Magnesium can help with cramps. Stay hydrated.'
  } else if (dayOfCycle <= follicularEnd) {
    phase = 'follicular'
    label = 'Follicular'
    emoji = '🟢'
    color = 'text-green-400'
    bgColor = 'bg-green-500/10'
    borderColor = 'border-green-500/30'
    description = 'Rising energy — great time for high-intensity training'
    nutritionTip = 'Higher carb tolerance now. Great time to fuel hard training sessions. Your body uses glycogen efficiently.'
  } else if (dayOfCycle <= ovulatoryEnd) {
    phase = 'ovulatory'
    label = 'Ovulatory'
    emoji = '⚡'
    color = 'text-yellow-400'
    bgColor = 'bg-yellow-500/10'
    borderColor = 'border-yellow-500/30'
    description = 'Peak energy and strength — your best performance window'
    nutritionTip = 'Peak performance window. Fuel for intensity. Protein synthesis is high — great time for strength gains.'
  } else {
    phase = 'luteal'
    label = 'Luteal'
    emoji = '🟣'
    color = 'text-purple-400'
    bgColor = 'bg-purple-500/10'
    borderColor = 'border-purple-500/30'
    description = 'Metabolism rises — cravings are normal, your body needs more fuel'
    nutritionTip = 'BMR is elevated 100-300 cal. Cravings are biological, not weakness. Slightly more fat and protein can help. Stay hydrated — core temp is higher.'
  }
  
  return {
    phase,
    dayOfCycle,
    daysUntilNextPeriod,
    label,
    emoji,
    color,
    bgColor,
    borderColor,
    description,
    nutritionTip,
  }
}

/**
 * Get macro adjustment factors based on cycle phase
 * Returns multipliers to apply to base macro calculations
 * 
 * Based on:
 * - Webb (1986): Luteal BMR increase of ~100-300 kcal
 * - Oosthuyse & Bosch (2010): Substrate utilization shifts across cycle
 */
export function getCycleMacroAdjustments(phase: CyclePhase): {
  calorieAdjustment: number  // Additional calories (not a multiplier)
  carbMultiplier: number     // Multiplier for carb g/kg target
  fatMultiplier: number      // Multiplier for fat allocation
  proteinMultiplier: number  // Multiplier for protein g/kg target
  note: string
} {
  switch (phase) {
    case 'menstrual':
      return {
        calorieAdjustment: 0,
        carbMultiplier: 1.0,
        fatMultiplier: 1.0,
        proteinMultiplier: 1.0,
        note: 'Menstrual phase: standard macros, prioritize iron-rich foods',
      }
    case 'follicular':
      return {
        calorieAdjustment: 0,
        carbMultiplier: 1.05,   // Slightly higher carb tolerance
        fatMultiplier: 0.95,
        proteinMultiplier: 1.0,
        note: 'Follicular phase: higher carb tolerance, efficient glycogen storage',
      }
    case 'ovulatory':
      return {
        calorieAdjustment: 50,
        carbMultiplier: 1.05,
        fatMultiplier: 1.0,
        proteinMultiplier: 1.05,  // Higher protein synthesis
        note: 'Ovulatory phase: peak performance, slightly elevated needs',
      }
    case 'luteal':
      return {
        calorieAdjustment: 150,   // BMR increase (conservative mid-range of 100-300)
        carbMultiplier: 0.92,     // Reduced carb tolerance
        fatMultiplier: 1.15,      // Increased fat oxidation
        proteinMultiplier: 1.05,  // Slightly higher protein needs
        note: 'Luteal phase: BMR elevated ~150 kcal, shifted to higher fat oxidation (Webb, 1986)',
      }
    default:
      return {
        calorieAdjustment: 0,
        carbMultiplier: 1.0,
        fatMultiplier: 1.0,
        proteinMultiplier: 1.0,
        note: 'Cycle phase unknown — using standard macros',
      }
  }
}

/**
 * Format cycle day display
 */
export function formatCycleDay(dayOfCycle: number, cycleLength: number): string {
  return `Day ${dayOfCycle} of ${cycleLength}`
}
