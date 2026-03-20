'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SupplementsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [supplements, setSupplements] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
  })

  useEffect(() => { loadSupplements() }, [])

  async function loadSupplements() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()
    if (!athlete) return
    const { data } = await supabase
      .from('supplements')
      .select('*')
      .eq('athlete_id', athlete.id)
      .order('created_at', { ascending: false })
    if (data) setSupplements(data)
  }

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setAnalysis(null)
  }

  async function analyzeSupplements() {
    if (!form.name) { setError('Please enter a supplement name'); return }
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch('/api/supplements/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, brand: form.brand, category: form.category }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setAnalyzing(false); return }
      setAnalysis(data)
    } catch {
      setError('Analysis failed. Please try again.')
    }
    setAnalyzing(false)
  }

  async function handleSubmit() {
    if (!form.name) { setError('Please enter a supplement name'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single()
    if (!athlete) { setLoading(false); return }
    await supabase.from('supplements').insert({
      athlete_id: athlete.id,
      name: form.name,
      brand: form.brand || null,
      category: form.category || null,
      risk_level: analysis?.riskLevel || 'low',
      status: 'pending',
      ai_explanation: analysis?.explanation || null,
    })
    setForm({ name: '', brand: '', category: '' })
    setAnalysis(null)
    setShowForm(false)
    setLoading(false)
    loadSupplements()
  }

  const statusStyles: any = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    denied: 'bg-red-500/10 text-red-400 border-red-500/20',
    needs_info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  const riskStyles: any = {
    low: 'text-green-400',
    moderate: 'text-yellow-400',
    high: 'text-red-400',
    banned: 'text-red-500 font-bold',
  }

  const inputClass = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/athlete/dashboard')}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold">Supplements</h1>
              <p className="text-zinc-500 text-sm">AI-reviewed for safety</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            + Add
          </button>
        </div>

        {showForm && (
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-6">
            <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-4">
              New supplement request
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-zinc-400 text-sm mb-1 block">Supplement name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="e.g. Creatine Monohydrate"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm mb-1 block">Brand (optional)</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={e => update('brand', e.target.value)}
                  placeholder="e.g. Optimum Nutrition"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={e => update('category', e.target.value)}
                  className={inputClass + ' appearance-none'}
                >
                  <option value="">Select category...</option>
                  <option value="protein">Protein</option>
                  <option value="creatine">Creatine</option>
                  <option value="pre_workout">Pre-workout</option>
                  <option value="vitamins">Vitamins / Minerals</option>
                  <option value="recovery">Recovery</option>
                  <option value="weight_gainer">Weight gainer</option>
                  <option value="fat_burner">Fat burner</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {analysis && (
                <div className={`rounded-xl p-4 border ${
                  analysis.riskLevel === 'low' ? 'bg-green-500/10 border-green-500/20' :
                  analysis.riskLevel === 'moderate' ? 'bg-yellow-500/10 border-yellow-500/20' :
                  'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">AI Safety Review</span>
                    <span className={`text-xs font-bold uppercase ${riskStyles[analysis.riskLevel]}`}>
                      {analysis.riskLevel} risk
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-2">
                    {analysis.explanation}
                  </p>
                  {analysis.requiresParentApproval && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-2">
                      <p className="text-yellow-400 text-xs font-medium">
                        Parent/guardian approval required
                      </p>
                    </div>
                  )}
                  {analysis.bannedWarning && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-2">
                      <p className="text-red-400 text-xs font-medium">
                        {analysis.bannedWarning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {!analysis ? (
                  <button
                    onClick={analyzeSupplements}
                    disabled={analyzing || !form.name}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium py-3 rounded-xl transition-colors text-sm"
                  >
                    {analyzing ? 'Analyzing...' : 'AI Safety Check'}
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || analysis.riskLevel === 'banned'}
                    className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-semibold py-3 rounded-xl transition-colors"
                  >
                    {loading ? 'Submitting...' : analysis.riskLevel === 'banned' ? 'Cannot submit — banned substance' : 'Submit for approval'}
                  </button>
                )}
                <button
                  onClick={() => { setShowForm(false); setAnalysis(null); setError('') }}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {supplements.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">💊</div>
            <p className="text-zinc-400 font-medium">No supplements logged yet</p>
            <p className="text-zinc-600 text-sm mt-2">
              Add a supplement to get an AI safety review
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {supplements.map(s => (
              <div key={s.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{s.name}</h3>
                    {s.brand && (
                      <p className="text-zinc-500 text-sm">{s.brand}</p>
                    )}
                    {s.category && (
                      <p className="text-zinc-600 text-xs mt-1 capitalize">
                        {s.category.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full border capitalize ${statusStyles[s.status]}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                    {s.risk_level && (
                      <span className={`text-xs capitalize ${riskStyles[s.risk_level]}`}>
                        {s.risk_level} risk
                      </span>
                    )}
                  </div>
                </div>
                {s.ai_explanation && (
                  <p className="text-zinc-500 text-xs mt-3 leading-relaxed border-t border-zinc-800 pt-3">
                    {s.ai_explanation}
                  </p>
                )}
                {s.reviewer_notes && (
                  <div className="mt-3 bg-zinc-800 rounded-xl p-3">
                    <p className="text-xs text-zinc-400 font-medium mb-1">Coach notes:</p>
                    <p className="text-xs text-zinc-300">{s.reviewer_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}