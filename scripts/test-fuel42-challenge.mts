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
console.log('FUEL 42 scoring guardrails passed.')
