'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateMacroDraft } from '@/lib/meals/analysis.mjs'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

type SavedMeal = {
  id: string
  title: string
  description: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  meal_type: MealType | null
  source: 'manual' | 'corrected_ai'
  updated_at: string
}

type Draft = {
  title: string
  description: string
  calories: string
  protein: string
  carbs: string
  fat: string
  meal_type: MealType
}

const EMPTY_DRAFT: Draft = {
  title: '', description: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'breakfast',
}

export default function SavedMealsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([])
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function loadSavedMeals() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()
    if (!athlete) {
      router.push('/athlete/onboarding')
      return
    }
    setAthleteId(athlete.id)
    const { data, error } = await supabase
      .from('meal_templates')
      .select('id, title, description, calories, protein, carbs, fat, meal_type, source, updated_at')
      .eq('athlete_id', athlete.id)
      .order('updated_at', { ascending: false })
    if (error) setNotice({ type: 'error', text: 'Unable to load saved meals yet. Please try again.' })
    else setSavedMeals((data || []) as SavedMeal[])
    setLoading(false)
  }

  useEffect(() => {
    loadSavedMeals()
    // Supabase client is stable for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredMeals = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return savedMeals
    return savedMeals.filter(meal =>
      meal.title.toLowerCase().includes(normalized) || (meal.description || '').toLowerCase().includes(normalized)
    )
  }, [query, savedMeals])

  function startNew() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setNotice(null)
    setShowEditor(true)
  }

  function startEdit(meal: SavedMeal) {
    setEditingId(meal.id)
    setDraft({
      title: meal.title,
      description: meal.description || '',
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
      meal_type: meal.meal_type || 'breakfast',
    })
    setNotice(null)
    setShowEditor(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveTemplate() {
    if (!athleteId || !draft.title.trim()) {
      setNotice({ type: 'error', text: 'Give this saved meal a name.' })
      return
    }
    const macroValidation = validateMacroDraft(draft)
    if (!macroValidation.valid) {
      setNotice({ type: 'error', text: macroValidation.error || 'Enter valid macros.' })
      return
    }
    setSaving(true)
    setNotice(null)
    const payload = {
      athlete_id: athleteId,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      calories: macroValidation.values.calories,
      protein: macroValidation.values.protein,
      carbs: macroValidation.values.carbs,
      fat: macroValidation.values.fat,
      meal_type: draft.meal_type,
      source: 'manual' as const,
    }
    const response = editingId
      ? await supabase.from('meal_templates').update(payload).eq('id', editingId)
      : await supabase.from('meal_templates').insert(payload)
    if (response.error) {
      setNotice({ type: 'error', text: 'Unable to save this meal. Please try again.' })
    } else {
      setNotice({ type: 'success', text: editingId ? 'Saved meal updated.' : 'Saved meal created.' })
      setShowEditor(false)
      setEditingId(null)
      setDraft(EMPTY_DRAFT)
      await loadSavedMeals()
    }
    setSaving(false)
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm('Remove this saved meal? Your past meal history will stay unchanged.')) return
    const { error } = await supabase.from('meal_templates').delete().eq('id', id)
    if (error) setNotice({ type: 'error', text: 'Unable to remove this saved meal.' })
    else {
      setSavedMeals(current => current.filter(meal => meal.id !== id))
      setNotice({ type: 'success', text: 'Saved meal removed.' })
    }
  }

  async function logSavedMeal(meal: SavedMeal) {
    if (!athleteId) return
    setLoggingId(meal.id)
    const date = new Date()
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const { error } = await supabase.from('meal_logs').insert({
      athlete_id: athleteId,
      meal_title: meal.title,
      description: meal.description,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      confidence: 'high',
      ai_feedback: null,
      ai_next_step: null,
      meal_type: meal.meal_type,
      date: localDate,
      logged_at: new Date().toISOString(),
    })
    if (error) setNotice({ type: 'error', text: 'Unable to log this saved meal.' })
    else setNotice({ type: 'success', text: `${meal.title} added to today.` })
    setLoggingId(null)
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-4">
          <button onClick={() => router.push('/athlete/meals')} className="text-xl text-slate-400 transition-colors hover:text-white" aria-label="Back to meal logging">←</button>
          <div className="min-w-0 flex-1"><h1 className="text-2xl font-bold">Saved Meals &amp; Recipes</h1><p className="text-xs text-slate-400">Your personal, reusable macros and ingredient notes</p></div>
          <button onClick={startNew} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700">+ New</button>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
        {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>{notice.text}</div>}

        <section className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-4">
          <p className="text-sm font-semibold text-white">Use a saved meal when the food is the same.</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Enter the ingredients and verified totals once. Then add it in one tap—no AI estimate needed for each repeat meal.</p>
        </section>

        {showEditor && (
          <section className="rounded-xl border border-purple-500/35 bg-slate-800/70 p-4">
            <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{editingId ? 'Edit saved meal' : 'Create a saved meal'}</p><p className="mt-1 text-xs text-slate-400">Use the ingredient notes so you remember exactly what this entry includes.</p></div><button onClick={() => { setShowEditor(false); setEditingId(null); setDraft(EMPTY_DRAFT) }} className="text-lg text-slate-500 hover:text-white" aria-label="Close editor">×</button></div>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">Meal or recipe name<input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="e.g., Turkey chili — 1 bowl" className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" /></label>
              <label className="block text-xs font-medium text-slate-300">Ingredients or notes<textarea value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} placeholder="Include brands, amounts, recipe yield, or what one serving means." rows={3} className="mt-1 w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" /></label>
              <label className="block text-xs font-medium text-slate-300">Category<select value={draft.meal_type} onChange={event => setDraft(current => ({ ...current, meal_type: event.target.value as MealType }))} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none">{(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3">{([{ key: 'calories', label: 'Calories', unit: 'kcal' }, { key: 'protein', label: 'Protein', unit: 'g' }, { key: 'carbs', label: 'Carbs', unit: 'g' }, { key: 'fat', label: 'Fat', unit: 'g' }] as const).map(field => <label key={field.key} className="block text-xs font-medium text-slate-300">{field.label}<div className="relative mt-1"><input type="number" inputMode="decimal" min="0" step={field.key === 'calories' ? '1' : '0.1'} value={draft[field.key]} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 pr-11 text-sm text-white focus:border-purple-500 focus:outline-none" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">{field.unit}</span></div></label>)}</div>
              <button onClick={saveTemplate} disabled={saving} className="w-full rounded-lg bg-purple-600 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Save changes' : 'Save meal'}</button>
            </div>
          </section>
        )}

        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search saved meals and ingredients..." className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" /></div>

        {loading ? <div className="py-12 text-center text-sm text-slate-400">Loading saved meals...</div> : filteredMeals.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/35 px-6 py-12 text-center"><p className="font-semibold text-white">{query ? 'No saved meals found' : 'No saved meals yet'}</p><p className="mt-2 text-sm leading-6 text-slate-400">{query ? 'Try a different search term.' : 'Create a recipe manually, or save a corrected AI meal after you review its macros.'}</p>{!query && <button onClick={startNew} className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">Create your first saved meal</button>}</div> : <div className="space-y-3">{filteredMeals.map(meal => <article key={meal.id} className="rounded-xl border border-slate-700 bg-slate-800/55 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold text-white">{meal.title}</h2><span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] capitalize text-slate-400">{meal.meal_type || 'meal'}</span></div>{meal.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{meal.description}</p>}</div><p className="shrink-0 text-sm font-bold text-purple-300">{Math.round(meal.calories)}<span className="ml-1 text-[10px] font-normal text-slate-500">kcal</span></p></div><p className="mt-3 text-xs text-slate-400">{meal.protein}g P · {meal.carbs}g C · {meal.fat}g F</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => logSavedMeal(meal)} disabled={loggingId === meal.id} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{loggingId === meal.id ? 'Adding...' : '+ Log today'}</button><button onClick={() => startEdit(meal)} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-400 hover:text-white">Edit</button><button onClick={() => deleteTemplate(meal.id)} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10">Remove</button></div></article>)}</div>}
      </div>
    </main>
  )
}
