'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getZoneInfo } from '@/lib/fuel-score'

interface JournalEntry {
  date: string
  wellness_score: number | null
  sleep_quality: number | null
  energy: number | null
  stress: number | null
  soreness: number | null
  hydration_status: number | null
  hunger: number | null
  notes: string | null
  training_type: string | null
}

export default function FuelJournalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Get date from query params if provided
  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (dateParam) {
      setExpandedDate(dateParam)
    }
  }, [searchParams])

  useEffect(() => {
    loadJournalEntries()
  }, [])

  async function loadJournalEntries() {
    try {
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

      setAthleteId(athlete.id)

      // Get last 90 days of check-ins
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('date, wellness_score, sleep_quality, energy, stress, soreness, hydration_status, hunger, notes, training_type')
        .eq('athlete_id', athlete.id)
        .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (checkins) {
        setEntries(checkins)
      }
    } catch (error) {
      console.error('Error loading journal entries:', error)
    } finally {
      setLoading(false)
    }
  }

  function getZoneLabel(score: number | null): string {
    if (score === null) return 'No Data'
    if (score >= 85) return 'Locked In'
    if (score >= 70) return 'On Track'
    if (score >= 50) return 'Dial It In'
    return 'Red Flag'
  }

  function getZoneColor(score: number | null): string {
    if (score === null) return 'bg-slate-700 text-slate-300'
    if (score >= 85) return 'bg-green-500/20 text-green-300 border-green-500/30'
    if (score >= 70) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    return 'bg-red-500/20 text-red-300 border-red-500/30'
  }

  function getMetricColor(value: number | null, inverted: boolean = false): string {
    if (value === null) return 'text-slate-400'
    if (inverted) {
      // Low is good (green), high is bad (red)
      if (value <= 3) return 'text-green-400'
      if (value <= 6) return 'text-yellow-400'
      return 'text-red-400'
    } else {
      // High is good (green), low is bad (red)
      if (value >= 7) return 'text-green-400'
      if (value >= 5) return 'text-yellow-400'
      return 'text-red-400'
    }
  }

  function getMetricEmoji(value: number | null, inverted: boolean = false): string {
    if (value === null) return '—'
    if (inverted) {
      if (value <= 3) return '🟢'
      if (value <= 6) return '🟡'
      return '🔴'
    } else {
      if (value >= 7) return '🟢'
      if (value >= 5) return '🟡'
      return '🔴'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-slate-400">Loading your journal...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium mb-3 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">📔 Fuel Journal</h1>
          <p className="text-slate-400">
            Your personal wellness reflections. Track patterns and see how your daily habits impact your Fuel Score.
          </p>
        </div>

        {/* Month Filter */}
        {entries.length > 0 && (() => {
          const months = new Set<string>()
          entries.forEach(entry => {
            const [year, month] = entry.date.split('-')
            months.add(`${year}-${month}`)
          })
          const sortedMonths = Array.from(months).sort().reverse()

          return (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {sortedMonths.map(month => {
                const [year, monthNum] = month.split('-')
                const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                return (
                  <button
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                      selectedMonth === month
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {monthName}
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Entries */}
        {entries.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">No journal entries yet.</p>
                <p className="text-slate-500 text-sm mb-6">
                  Start by completing your daily check-in to create your first journal entry.
                </p>
                <Button
                  onClick={() => router.push('/athlete/checkin')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Start Check-in
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries
              .filter(entry => {
                const [year, month] = entry.date.split('-')
                return `${year}-${month}` === selectedMonth
              })
              .map((entry) => {
              const isExpanded = expandedDate === entry.date
              const zoneLabel = getZoneLabel(entry.wellness_score)
              const zoneColor = getZoneColor(entry.wellness_score)
              const dateObj = new Date(entry.date)
              const dateStr = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })

              return (
                <div key={entry.date}>
                  <button
                    onClick={() => setExpandedDate(isExpanded ? null : entry.date)}
                    className="w-full"
                  >
                    <Card className="hover:border-purple-500/40 transition-all active:scale-[0.98]">
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-white">{dateStr}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {entry.notes && entry.notes.length > 0
                                ? entry.notes.substring(0, 60) + (entry.notes.length > 60 ? '...' : '')
                                : 'No notes'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${zoneColor}`}>
                              {entry.wellness_score !== null ? entry.wellness_score : '—'} {zoneLabel}
                            </div>
                            <span className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-2 p-4 rounded-xl border border-slate-700 bg-slate-800/30 space-y-4">
                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-1">Sleep Quality</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${getMetricColor(entry.sleep_quality, false)}`}>
                              {getMetricEmoji(entry.sleep_quality, false)}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {entry.sleep_quality !== null ? `${entry.sleep_quality}/10` : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-1">Energy</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${getMetricColor(entry.energy, false)}`}>
                              {getMetricEmoji(entry.energy, false)}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {entry.energy !== null ? `${entry.energy}/10` : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-1">Stress</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${getMetricColor(entry.stress, true)}`}>
                              {getMetricEmoji(entry.stress, true)}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {entry.stress !== null ? `${entry.stress}/10` : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-1">Soreness</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${getMetricColor(entry.soreness, true)}`}>
                              {getMetricEmoji(entry.soreness, true)}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {entry.soreness !== null ? `${entry.soreness}/10` : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-1">Hydration</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${getMetricColor(entry.hydration_status, false)}`}>
                              {getMetricEmoji(entry.hydration_status, false)}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {entry.hydration_status !== null ? `${entry.hydration_status}/10` : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-1">Hunger</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${getMetricColor(entry.hunger, true)}`}>
                              {getMetricEmoji(entry.hunger, true)}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {entry.hunger !== null ? `${entry.hunger}/10` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Training Type */}
                      {entry.training_type && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-1">Training Type</p>
                          <p className="text-sm font-semibold text-white capitalize">{entry.training_type}</p>
                        </div>
                      )}

                      {/* Journal Notes */}
                      {entry.notes && entry.notes.length > 0 && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-2">Your Notes</p>
                          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {entry.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        
        {/* No entries for selected month */}
        {entries.length > 0 && entries.filter(e => {
          const [year, month] = e.date.split('-')
          return `${year}-${month}` === selectedMonth
        }).length === 0 && (
          <Card>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-slate-400">No entries for this month.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
