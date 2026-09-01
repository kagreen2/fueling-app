export type MealConfidence = 'high' | 'medium' | 'low'

export type MealAnalysisResult = {
  mealTitle: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: MealConfidence
  feedback: string
  nextStep: string
  needsClarification: boolean
  clarifyingQuestion: string | null
  missingDetails: string[]
}

export type MacroDraft = {
  calories: string
  protein: string
  carbs: string
  fat: string
}

export function detectMealAmbiguities(context: {
  description?: string
  clarification?: string
  hasPhoto?: boolean
}): string[]

export function buildClarifyingQuestion(missingDetails: string[]): string | null

export function normalizeMealAnalysis(
  rawResult: Record<string, unknown>,
  context?: { description?: string; clarification?: string; hasPhoto?: boolean },
): MealAnalysisResult

export function validateMacroDraft(draft: MacroDraft):
  | { valid: true; error: null; values: { calories: number; protein: number; carbs: number; fat: number } }
  | { valid: false; error: string; values: null }
