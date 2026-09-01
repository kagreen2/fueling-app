import assert from 'node:assert/strict'
import {
  detectMealAmbiguities,
  normalizeMealAnalysis,
  validateMacroDraft,
} from '../lib/meals/analysis.mjs'

const baseAnalysis = {
  mealTitle: 'Test meal',
  calories: 500,
  protein: 35,
  carbs: 50,
  fat: 18,
  confidence: 'high',
  feedback: 'Balanced meal.',
  nextStep: 'Add water.',
  needsClarification: false,
  clarifyingQuestion: null,
  missingDetails: [],
}

assert.deepEqual(
  detectMealAmbiguities({ description: '4 oz baked chicken, 1 cup cooked rice, 1 cup broccoli' }),
  [],
)

const unitless = normalizeMealAnalysis(baseAnalysis, {
  description: '1/2 protein pancakes, 4 slices turkey bacon',
})
assert.equal(unitless.needsClarification, true)
assert.equal(unitless.confidence, 'medium')
assert.match(unitless.clarifyingQuestion, /unit|serving/i)

const clarifiedPancake = normalizeMealAnalysis(baseAnalysis, {
  description: '1/2 protein pancakes, 4 slices turkey bacon',
  clarification: 'I had half of one pancake.',
})
assert.equal(clarifiedPancake.needsClarification, false)

const rawOrCooked = normalizeMealAnalysis(baseAnalysis, {
  description: '14 oz eye of round steak, potatoes, Brussels sprouts',
})
assert.equal(rawOrCooked.needsClarification, true)
assert.match(rawOrCooked.clarifyingQuestion, /raw or cooked/i)

const clarified = normalizeMealAnalysis(baseAnalysis, {
  description: '14 oz eye of round steak, potatoes, Brussels sprouts',
  clarification: 'The steak was weighed cooked, and the potatoes were 12 ounces cooked.',
})
assert.equal(clarified.needsClarification, false)
assert.equal(clarified.confidence, 'high')

const photoOnly = normalizeMealAnalysis(baseAnalysis, { hasPhoto: true })
assert.equal(photoOnly.needsClarification, false)
assert.equal(photoOnly.confidence, 'medium')

const snakeCaseResponse = normalizeMealAnalysis({
  ...baseAnalysis,
  needsClarification: undefined,
  needs_clarification: true,
  clarifying_question: '',
}, { description: 'A meal' })
assert.equal(snakeCaseResponse.needsClarification, true)
assert.match(snakeCaseResponse.clarifyingQuestion, /portion|serving/i)

assert.deepEqual(validateMacroDraft({ calories: '620', protein: '44.5', carbs: '70', fat: '18' }), {
  valid: true,
  error: null,
  values: { calories: 620, protein: 44.5, carbs: 70, fat: 18 },
})
assert.equal(validateMacroDraft({ calories: '', protein: '20', carbs: '30', fat: '10' }).valid, false)
assert.equal(validateMacroDraft({ calories: '500', protein: '-2', carbs: '30', fat: '10' }).valid, false)

console.log('Meal-analysis guardrail tests passed.')
