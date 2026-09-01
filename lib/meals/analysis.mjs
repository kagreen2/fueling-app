const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low'])

const PORTION_UNITS = [
  'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp',
  'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs', 'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg', 'milliliter', 'milliliters', 'ml', 'liter', 'liters',
  'slice', 'slices', 'piece', 'pieces', 'scoop', 'scoops', 'packet', 'packets',
  'container', 'containers', 'can', 'cans', 'bottle', 'bottles', 'bar', 'bars',
  'wrap', 'wraps', 'sandwich', 'sandwiches', 'egg', 'eggs', 'apple', 'apples',
  'banana', 'bananas', 'orange', 'oranges', 'grape', 'grapes', 'tortilla', 'tortillas',
  'pancake', 'pancakes',
]

const AMBIGUOUS_FRACTION_FOODS = [
  'protein pancake', 'protein pancakes', 'pancake mix', 'oats', 'rice', 'pasta',
  'cereal', 'yogurt', 'salad', 'chicken', 'beef', 'ground beef', 'turkey',
  'salmon', 'fish', 'shrimp', 'potatoes', 'vegetables', 'dressing', 'sauce',
  'peanut butter', 'hummus', 'milk', 'cheese', 'recipe', 'batch', 'portion', 'meal',
]

const WEIGHED_PROTEINS = [
  'chicken', 'beef', 'steak', 'turkey', 'salmon', 'fish', 'shrimp', 'pork',
  'tuna', 'cod', 'tilapia', 'lamb', 'ground meat', 'ground beef', 'ground turkey',
]

const PREPARATION_WORDS = [
  'raw', 'uncooked', 'cooked', 'grilled', 'baked', 'roasted', 'fried', 'air-fried',
  'steamed', 'smoked', 'poached', 'seared', 'deli', 'prepared', 'drained',
]

const FRIENDLY_DETAIL_LABELS = {
  meal_details: 'the foods and approximate portions',
  portion_unit: 'the unit or amount for an incomplete portion',
  serving_size: 'the package serving size',
  raw_or_cooked: 'whether a listed weight was measured raw or cooked',
}

function asFiniteNumber(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback
}

function normalizeConfidence(value) {
  const normalized = String(value || '').toLowerCase()
  return CONFIDENCE_LEVELS.has(normalized) ? normalized : 'low'
}

function includesAny(text, values) {
  return values.some(value => text.includes(value))
}

function hasPortionUnit(text) {
  const normalized = text.toLowerCase()
  return PORTION_UNITS.some(unit => new RegExp(`\\b${unit.replace('-', '\\-')}\\b`, 'i').test(normalized))
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

/**
 * Detects portion details that are too ambiguous for a high-confidence estimate.
 * The AI still handles semantic food recognition; these checks provide a deterministic
 * safety net for the most consequential recurring input patterns.
 */
export function detectMealAmbiguities({ description = '', clarification = '', hasPhoto = false }) {
  const original = String(description || '').trim().toLowerCase()
  const answer = String(clarification || '').trim().toLowerCase()
  const combined = `${original} ${answer}`.trim()
  const missingDetails = []

  if (!hasPhoto && original.length < 3 && answer.length < 3) {
    missingDetails.push('meal_details')
  }

  const fractionPattern = /(?:^|\s)(?:\d+\s+)?(?:\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])\s+([^,.;]+)/gi
  let fractionMatch
  while ((fractionMatch = fractionPattern.exec(original)) !== null) {
    const followingText = fractionMatch[1].trim()
    const beginsWithKnownUnit = PORTION_UNITS.some(unit =>
      followingText === unit || followingText.startsWith(`${unit} `)
    )
    const looksLikeAmbiguousFood = AMBIGUOUS_FRACTION_FOODS.some(food =>
      followingText === food || followingText.startsWith(`${food} `)
    )

    if (!beginsWithKnownUnit && looksLikeAmbiguousFood && !hasPortionUnit(answer)) {
      missingDetails.push('portion_unit')
      break
    }
  }

  const hasServingCount = /\b\d+(?:\.\d+)?\s+servings?\b/i.test(original)
  const answerDefinesServing = hasPortionUnit(answer) || /\b(?:label|package)\b/i.test(answer)
  if (hasServingCount && !answerDefinesServing) {
    missingDetails.push('serving_size')
  }

  const hasWeight = /\b\d+(?:\.\d+)?\s*(?:oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|kilogram|kilograms)\b/i.test(original)
  const mentionsWeighedProtein = includesAny(original, WEIGHED_PROTEINS)
  const preparationIsKnown = includesAny(combined, PREPARATION_WORDS)
  if (hasWeight && mentionsWeighedProtein && !preparationIsKnown) {
    missingDetails.push('raw_or_cooked')
  }

  return unique(missingDetails)
}

export function buildClarifyingQuestion(missingDetails) {
  const missing = unique(missingDetails)
  if (missing.length === 0) return null

  if (missing.length === 1) {
    switch (missing[0]) {
      case 'meal_details':
        return 'What foods were included, and about how much of each did you have?'
      case 'portion_unit':
        return 'What unit or serving did you mean for that portion (for example, cups, ounces, grams, pieces, or the package serving size)?'
      case 'serving_size':
        return 'What amount is one serving according to the package (for example, grams, ounces, cups, or pieces)?'
      case 'raw_or_cooked':
        return 'Was the listed meat or fish weight measured raw or cooked?'
      default:
        return 'What portion or serving detail can you add so I can improve this estimate?'
    }
  }

  const readable = missing
    .map(detail => FRIENDLY_DETAIL_LABELS[detail] || detail.replaceAll('_', ' '))
    .join('; ')
  return `Before I finalize the estimate, please clarify: ${readable}.`
}

/**
 * Normalizes the model response and applies deterministic confidence guardrails.
 */
export function normalizeMealAnalysis(rawResult, context = {}) {
  const deterministicMissing = detectMealAmbiguities(context)
  const rawMissingDetails = rawResult?.missingDetails ?? rawResult?.missing_details
  const modelMissing = Array.isArray(rawMissingDetails)
    ? rawMissingDetails.map(value => String(value).trim()).filter(Boolean)
    : []
  const missingDetails = unique([...modelMissing, ...deterministicMissing])

  const rawQuestion = rawResult?.clarifyingQuestion ?? rawResult?.clarifying_question
  const modelQuestion = typeof rawQuestion === 'string'
    ? rawQuestion.trim()
    : ''
  const modelNeedsClarification = rawResult?.needsClarification === true
    || rawResult?.needs_clarification === true
    || Boolean(modelQuestion)
  const needsClarification = modelNeedsClarification || missingDetails.length > 0

  let confidence = normalizeConfidence(rawResult?.confidence)
  if (needsClarification && confidence === 'high') confidence = 'medium'
  if (missingDetails.length >= 2) confidence = 'low'
  if (context.hasPhoto && !String(context.description || '').trim() && confidence === 'high') {
    confidence = 'medium'
  }

  return {
    mealTitle: String(rawResult?.mealTitle || rawResult?.meal_title || 'Meal').trim() || 'Meal',
    calories: Math.round(asFiniteNumber(rawResult?.calories)),
    protein: Math.round(asFiniteNumber(rawResult?.protein) * 10) / 10,
    carbs: Math.round(asFiniteNumber(rawResult?.carbs) * 10) / 10,
    fat: Math.round(asFiniteNumber(rawResult?.fat) * 10) / 10,
    confidence,
    feedback: String(rawResult?.feedback || '').trim(),
    nextStep: String(rawResult?.nextStep || rawResult?.next_step || '').trim(),
    needsClarification,
    clarifyingQuestion: needsClarification
      ? modelQuestion
        || buildClarifyingQuestion(missingDetails)
        || 'What portion or serving detail can you add so I can improve this estimate?'
      : null,
    missingDetails,
  }
}

export function validateMacroDraft(draft) {
  const limits = { calories: 10000, protein: 1000, carbs: 1000, fat: 1000 }
  const labels = { calories: 'Calories', protein: 'Protein', carbs: 'Carbohydrates', fat: 'Fat' }
  const values = {}

  for (const key of Object.keys(limits)) {
    const raw = String(draft?.[key] ?? '').trim()
    const value = Number(raw)
    if (!raw || !Number.isFinite(value)) {
      return { valid: false, error: `${labels[key]} must be a number.`, values: null }
    }
    if (value < 0) {
      return { valid: false, error: `${labels[key]} cannot be negative.`, values: null }
    }
    if (value > limits[key]) {
      return { valid: false, error: `${labels[key]} is outside the supported range.`, values: null }
    }
    values[key] = key === 'calories' ? Math.round(value) : Math.round(value * 10) / 10
  }

  return { valid: true, error: null, values }
}
