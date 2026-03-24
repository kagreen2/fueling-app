'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ParentDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('meals')
  const [profile, setProfile] = useState<any>(null)
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null)
  const [meals, setMeals] = useState<any[]>([])
  const [hydration, setHydration] = useState<any[]>([])
  const [supplements, setSupplements] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (selectedAthlete) loadAthleteData(selectedAthlete.id)
  }, [selectedAthlete])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    const { data: links } = await supabase
      .from('parent_athlete_links')
      .select(`
        athlete_id,
        confirmed,
        athletes(
          id,
          weight_lbs,
          goal_phase,
          season_phase,
          dob,
          sport_id,
          onboarding_complete,
          profiles!athletes_profile_id_fkey(full_name, email)
        )
      `)
      .eq('parent_id', user.id)
      .eq('confirmed', true)

    if (links && links.length > 0) {
      const athleteList = links.map((l: any) => l.athletes)
      setAthletes(athleteList)
      setSelectedAthlete(athleteList[0])
    }

    setLoading(false)
  }

  async function loadAthleteData(athleteId: string) {
    const { data: mealData } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('logged_at', { ascending: false })
      .limit(10)

    if (mealData) setMeals(mealData)

    const { data: hydrationData } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: false })
      .limit(7)

    if (hydrationData) setHydration(hydrationData)

    const { data: suppData } = await supabase
      .from('supplements')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })

    if (suppData) setSupplements(suppData)

    const { data: checkinData } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('date', { ascending: false })
      .limit(7)

    if (checkinData) setCheckins(checkinData)
  }

  async function handleSupplementApproval(suppId: string, approved: boolean) {
    await supabase
      .from('supplements')
      .update({
        parent_approved: approved,
        parent_reviewed_at: new Date().toISOString(),
      })
      .eq('id', suppId)

    if (selectedAthlete) loadAthleteData(selectedAthlete.id)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const confidenceColor: any = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-red-400',
  }

  const statusStyles: any = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    denied: 'bg-red-500/10 text-red-400 border-red-500/20',
    needs_info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Parent Portal</h1>
            <p className="text-zinc-500 text-sm mt-1">{profile?.full_name}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-zinc-600 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* No athletes linked */}
        {athletes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👨‍👩‍👧</div>
            <h2 className="text-white font-semibold text-lg mb-2">No athletes linked</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Ask your athlete to link your account from their profile,
              or contact your coach for an invite link.
            </p>
          </div>
        ) : (
          <>
            {/* Athlete selector */}
            {athletes.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {athletes.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAthlete(a)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedAthlete?.id === a.id
                        ? 'bg-green-500 text-black'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {a.profiles?.full_name}
                  </button>
                ))}
              </div>
            )}

            {/* Athlete summary card */}
            {selectedAthlete && (
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">
                      {selectedAthlete.profiles?.full_name}
                    </h2>
                    <p className="text-zinc-500 text-sm capitalize mt-1">
                      {selectedAthlete.goal_phase?.replace(/_/g, ' ')} •{' '}
                      {selectedAthlete.season_phase?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    {selectedAthlete.weight_lbs && (
                      <p className="text-white font-semibold">
                        {selectedAthlete.weight_lbs} lbs
                      </p>
                    )}
                    <span className={`text-xs ${
                      selectedAthlete.onboarding_complete
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}>
                      {selectedAthlete.onboarding_complete ? 'Active' : 'Setting up'}
                    </span>
                  </div>
                </div>

                {/* Quick stats from recent checkin */}
                {checkins.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {checkins[0].energy}/10
                      </div>
                      <div className="text-zinc-500 text-xs">Energy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {checkins[0].sleep_hours}h
                      </div>
                      <div className="text-zinc-500 text-xs">Sleep</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {checkins[0].body_weight_lbs} lbs
                      </div>
                      <div className="text-zinc-500 text-xs">Weight</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              {[
                { id: 'meals', label: 'Meals' },
                { id: 'hydration', label: 'Hydration' },
                { id: 'supplements', label: `Supplements${supplements.filter(s => s.parent_approved === null).length > 0 ? ' !' : ''}` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Meals tab */}
            {activeTab === 'meals' && (
              <div className="flex flex-col gap-3">
                {meals.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500">No meals logged yet</p>
                  </div>
                ) : (
                  meals.map(m => (
                    <div key={m.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-white">
                            {m.meal_title || 'Meal'}
                          </h3>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {new Date(m.logged_at).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {m.confidence && (
                          <span className={`text-xs ${confidenceColor[m.confidence]}`}>
                            {m.confidence} confidence
                          </span>
                        )}
                      </div>

                      {(m.est_calories || m.est_protein_g) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                          {[
                            { label: 'Cal', value: m.est_calories },
                            { label: 'Protein', value: m.est_protein_g ? m.est_protein_g + 'g' : null },
                            { label: 'Carbs', value: m.est_carbs_g ? m.est_carbs_g + 'g' : null },
                            { label: 'Fat', value: m.est_fat_g ? m.est_fat_g + 'g' : null },
                          ].map(macro => macro.value && (
                            <div key={macro.label} className="bg-zinc-800 rounded-xl p-2 text-center">
                              <div className="text-green-400 text-sm font-bold">{macro.value}</div>
                              <div className="text-zinc-500 text-xs">{macro.label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {m.ai_feedback && (
                        <p className="text-zinc-500 text-xs mt-3 leading-relaxed border-t border-zinc-800 pt-3">
                          {m.ai_feedback}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Hydration tab */}
            {activeTab === 'hydration' && (
              <div className="flex flex-col gap-3">
                {hydration.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500">No hydration logs yet</p>
                  </div>
                ) : (
                  hydration.map(h => (
                    <div key={h.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-white">
                          {new Date(h.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </h3>
                        <span className={`text-sm font-bold ${
                          (h.water_oz || 0) >= 80 ? 'text-green-400' :
                          (h.water_oz || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {h.water_oz || 0} oz
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full"
                          style={{ width: `${Math.min(((h.water_oz || 0) / 100) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-zinc-600 text-xs mt-2">Goal: 100 oz</p>
                      {h.electrolyte_oz > 0 && (
                        <p className="text-zinc-500 text-xs mt-1">
                          + {h.electrolyte_oz} oz electrolytes
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Supplements tab */}
            {activeTab === 'supplements' && (
              <div className="flex flex-col gap-3">
                {supplements.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500">No supplements requested yet</p>
                  </div>
                ) : (
                  supplements.map(s => (
                    <div key={s.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{s.name}</h3>
                          {s.brand && <p className="text-zinc-500 text-sm">{s.brand}</p>}
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full border capitalize ${statusStyles[s.status]}`}>
                          {s.status}
                        </span>
                      </div>

                      {s.ai_explanation && (
                        <div className="bg-zinc-800 rounded-xl p-3 mb-3">
                          <p className="text-zinc-300 text-xs leading-relaxed">
                            {s.ai_explanation}
                          </p>
                        </div>
                      )}

                      {s.parent_approved === null && (
                        <div className="mt-3">
                          <p className="text-yellow-400 text-xs font-medium mb-3">
                            Your approval is requested for this supplement
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleSupplementApproval(s.id, true)}
                              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold py-2.5 rounded-xl transition-colors text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleSupplementApproval(s.id, false)}
                              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl transition-colors text-sm border border-red-500/30"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      )}

                      {s.parent_approved === true && (
                        <p className="text-green-400 text-xs mt-2 font-medium">
                          You approved this supplement
                        </p>
                      )}

                      {s.parent_approved === false && (
                        <p className="text-red-400 text-xs mt-2 font-medium">
                          You denied this supplement
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  )
}