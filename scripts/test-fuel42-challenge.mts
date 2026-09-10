import assert from 'node:assert/strict'
import {
  FUEL42_END_DATE,
  FUEL42_START_DATE,
  getBodyFatPoints,
  getFuel42WeekIndex,
  getMusclePoints,
  hasWorkoutActivity,
  isFuel42Date,
} from '../lib/fuel42/challenge.ts'
import { hasVerifiedFuel42Access } from '../lib/fuel42/access.ts'
import { getFuel42GoalAdjustment } from '../lib/nutrition-calculator.ts'

assert.equal(FUEL42_START_DATE, '2026-09-14')
assert.equal(FUEL42_END_DATE, '2026-10-25')
assert.equal(isFuel42Date('2026-09-14'), true)
assert.equal(isFuel42Date('2026-10-25'), true)
assert.equal(isFuel42Date('2026-10-26'), false)
assert.equal(getFuel42WeekIndex('2026-09-14'), 1)
assert.equal(getFuel42WeekIndex('2026-10-25'), 6)
assert.equal(getFuel42WeekIndex('2026-10-26'), null)
assert.equal(hasWorkoutActivity('rest/recovery'), false)
assert.equal(hasWorkoutActivity('rest, lift'), true)
assert.equal(hasWorkoutActivity('practice, game'), true)
assert.equal(getBodyFatPoints(32, 30.8), 9)
assert.equal(getBodyFatPoints(32, 31.6), 3)
assert.equal(getBodyFatPoints(32, 32.2), 0)
assert.equal(getMusclePoints(100, 101.6), 9)
assert.equal(getMusclePoints(100, 102.5), 15)
assert.equal(getMusclePoints(100, 100.2), 0)

const duringAccessWindow = new Date('2026-09-20T12:00:00.000Z')
assert.equal(hasVerifiedFuel42Access({ status: 'claimed', accessExpiresAt: '2026-11-01T04:59:59.000Z' }, duringAccessWindow), true)
assert.equal(hasVerifiedFuel42Access({ status: 'onboarding_complete', accessExpiresAt: '2026-11-01T04:59:59.000Z' }, duringAccessWindow), true)
assert.equal(hasVerifiedFuel42Access({ status: 'setup_sent', accessExpiresAt: '2026-11-01T04:59:59.000Z' }, duringAccessWindow), false)
assert.equal(hasVerifiedFuel42Access({ status: 'canceled', accessExpiresAt: '2026-11-01T04:59:59.000Z' }, duringAccessWindow), false)
assert.equal(hasVerifiedFuel42Access({ status: 'claimed', accessExpiresAt: '2026-09-19T23:59:59.000Z' }, duringAccessWindow), false)
assert.equal(hasVerifiedFuel42Access(null, duringAccessWindow), false)

const fuel42MacroInput = {
  weight_lbs: 180,
  fuel42_goal_weight_lbs: 175,
  fuel42_target_date: '2026-10-25',
  fuel42_adjustment_active: true,
  calculation_date: '2026-09-01',
} as Parameters<typeof getFuel42GoalAdjustment>[0]
assert.equal(getFuel42GoalAdjustment(fuel42MacroInput).calories, -250)
assert.equal(getFuel42GoalAdjustment({ ...fuel42MacroInput, calculation_date: '2026-10-26' }).calories, 0)
assert.equal(getFuel42GoalAdjustment({ ...fuel42MacroInput, calculation_date: '2026-10-25' }).calories, 0)
assert.equal(getFuel42GoalAdjustment({ ...fuel42MacroInput, fuel42_adjustment_active: false }).calories, 0)
console.log('FUEL 42 scoring guardrails passed.')
