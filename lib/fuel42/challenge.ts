// FUEL 42 scoring and target guardrails. Public views expose points only, never health inputs or scan values.

export const FUEL42_START_DATE = '2026-09-14'
export const FUEL42_END_DATE = '2026-10-25'
export const FUEL42_TARGET_DATE = FUEL42_END_DATE

const REST_ACTIVITY_VALUES = new Set(['rest', 'recovery', 'rest/recovery'])

function dateFromYmd(value: string) {
  return new Date(`${value}T12:00:00Z`)
}

export function isFuel42Date(value: string) {
  return value >= FUEL42_START_DATE && value <= FUEL42_END_DATE
}

export function getFuel42WeekIndex(value: string) {
  const start = dateFromYmd(FUEL42_START_DATE).getTime()
  const current = dateFromYmd(value).getTime()
  const days = Math.floor((current - start) / 86_400_000)
  return days >= 0 && days < 42 ? Math.floor(days / 7) + 1 : null
}

export function hasWorkoutActivity(trainingType: string | null | undefined) {
  if (!trainingType) return false
  return trainingType
    .split(',')
    .map(value => value.trim().toLowerCase())
    .some(value => value.length > 0 && !REST_ACTIVITY_VALUES.has(value))
}

export function getBodyFatPoints(starting: number | null | undefined, final: number | null | undefined) {
  if (starting == null || final == null) return 0
  const reduction = starting - final
  if (reduction >= 2.1) return 15
  if (reduction >= 1.6) return 12
  if (reduction >= 1.1) return 9
  if (reduction >= 0.6) return 6
  if (reduction >= 0.1) return 3
  return 0
}

export function getMusclePoints(starting: number | null | undefined, final: number | null | undefined) {
  if (starting == null || final == null) return 0
  const gain = final - starting
  if (gain >= 2.5) return 15
  if (gain >= 2.0) return 12
  if (gain >= 1.5) return 9
  if (gain >= 1.0) return 6
  if (gain >= 0.5) return 3
  return 0
}

export function getDefaultLeaderboardName(fullName: string | null | undefined, firstName: string | null | undefined) {
  if (firstName?.trim()) {
    const lastInitial = fullName?.trim().split(/\s+/).slice(-1)[0]?.[0]
    return lastInitial ? `${firstName.trim()} ${lastInitial}.` : firstName.trim()
  }
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) || []
  if (parts.length === 0) return 'FUEL 42 Athlete'
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
}

export type Fuel42Points = {
  checkin: number
  meals: number
  workouts: number
  weighIns: number
  finalScan: number
  bodyFat: number
  muscle: number
  total: number
}

export function makeEmptyFuel42Points(): Fuel42Points {
  return { checkin: 0, meals: 0, workouts: 0, weighIns: 0, finalScan: 0, bodyFat: 0, muscle: 0, total: 0 }
}

export function totalFuel42Points(points: Omit<Fuel42Points, 'total'>): Fuel42Points {
  return { ...points, total: points.checkin + points.meals + points.workouts + points.weighIns + points.finalScan + points.bodyFat + points.muscle }
}
