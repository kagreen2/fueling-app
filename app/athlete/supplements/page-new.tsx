'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'

interface Supplement {
  id: string
  name: string
  brand?: string
  category?: string
  status: string
  risk_level: string
  ai_explanation?: string
  reviewer_notes?: string
}

const SUPPLEMENT_CATEGORIES = [
  { value: 'protein', label: 'Protein' },
  { value: 'creatine', label: 'Creatine' },
  { value: 'pre_workout', label: 'Pre-workout' },
  { value: 'vitamins', label: 'Vitamins / Minerals' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'weight_gainer', label: 'Weight Gainer' },
  { value: 'fat_burner', label: 'Fat Burner' },
  { value: 'other', label: 'Other' },
]

export default function SupplementsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
  })

  useEffect(() => {
    loadSupplements()
  }, [])

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
    if (!form.name) {
      setError('Please enter a supplement name')
      return
    }

    setAnalyzing(true)
    setError('')

    try {
      const res = await fetch('/api/supplements/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, brand: form.brand, category: form.category }),
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setAnalyzing(false)
        return
      }

      setAnalysis(data)
    } catch {
      setError('Analysis failed. Please try again.')
    }

    setAnalyzing(false)
  }

  async function handleSubmit() {
    if (!form.name) {
      setError('Please enter a supplement name')
      return
    }

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
      setLoading(false)
      return
    }

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

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/athlete/dashboard')}
              className="text-slate-400 hover:text-white transition-colors text-xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold">Supplements</h1>
              <p className="text-xs text-slate-400">AI-reviewed for safety</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">
        
        {/* Add Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader title="New Supplement Request" />
            <CardContent>
              <div className="space-y-4 mb-4">
                <Input
                  label="Supplement Name"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="e.g. Creatine Monohydrate"
                />
                <Input
                  label="Brand (optional)"
                  value={form.brand}
                  onChange={e => update('brand', e.target.value)}
                  placeholder="e.g. Optimum Nutrition"
                />
                <Select
                  label="Category"
                  value={form.category}
                  onChange={e => update('category', e.target.value)}
                  options={SUPPLEMENT_CATEGORIES}
                />
              </div>

              {error && (
                <Card className="mb-4 bg-red-500/10 border-red-500/20">
                  <CardContent>
                    <p className="text-sm text-red-400">{error}</p>
                  </CardContent>
                </Card>
              )}

              {analysis && (
                <Card className={`mb-4 ${
                  analysis.riskLevel === 'low' ? 'bg-green-500/10 border-green-500/20' :
                  analysis.riskLevel === 'moderate' ? 'bg-yellow-500/10 border-yellow-500/20' :
                  'bg-red-500/10 border-red-500/20'
                }`}>
                  <CardHeader
                    title="AI Safety Review"
                    action={
                      <span className={`text-xs font-bold uppercase ${riskStyles[analysis.riskLevel]}`}>
                        {analysis.riskLevel} risk
                      </span>
                    }
                  />
                  <CardContent>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">
                      {analysis.explanation}
                    </p>
                    {analysis.requiresParentApproval && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                        <p className="text-yellow-400 text-xs font-medium">
                          ⚠️ Parent/guardian approval required
                        </p>
                      </div>
                    )}
                    {analysis.bannedWarning && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-red-400 text-xs font-medium">
                          🚫 {analysis.bannedWarning}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                {!analysis ? (
                  <Button
                    onClick={analyzeSupplements}
                    isLoading={analyzing}
                    disabled={analyzing || !form.name}
                    variant="secondary"
                    size="lg"
                  >
                    {analyzing ? 'Analyzing...' : 'AI Safety Check'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    isLoading={loading}
                    disabled={loading || analysis.riskLevel === 'banned'}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {loading ? 'Submitting...' : analysis.riskLevel === 'banned' ? 'Cannot submit — banned substance' : 'Submit for approval'}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowForm(false)
                    setAnalysis(null)
                    setError('')
                  }}
                  variant="secondary"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supplements List */}
        {supplements.length === 0 && !showForm ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-5xl mb-4">💊</div>
                <p className="text-slate-400 font-medium">No supplements logged yet</p>
                <p className="text-slate-500 text-sm mt-2">
                  Add a supplement to get an AI safety review
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {supplements.map(s => (
              <Card key={s.id}>
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{s.name}</h3>
                      {s.brand && (
                        <p className="text-slate-400 text-sm">{s.brand}</p>
                      )}
                      {s.category && (
                        <p className="text-slate-500 text-xs mt-1 capitalize">
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
                    <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-700 pt-3">
                      {s.ai_explanation}
                    </p>
                  )}
                  {s.reviewer_notes && (
                    <div className="mt-3 bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-medium mb-1">Coach notes:</p>
                      <p className="text-xs text-slate-300">{s.reviewer_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
