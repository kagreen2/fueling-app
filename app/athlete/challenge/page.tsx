'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Points = { checkin: number; meals: number; workouts: number; weighIns: number; finalScan: number; bodyFat: number; muscle: number; total: number }
type Leaderboard = {
  startDate: string
  endDate: string
  entries: Array<{ rank: number; displayName: string; points: Points }>
  me: null | { rank: number | null; isVisible: boolean; displayName: string; points: Points }
}

const pointRows: Array<{ key: keyof Points; label: string; description: string }> = [
  { key: 'checkin', label: 'Fuel check-ins', description: '2 points each completed check-in' },
  { key: 'meals', label: 'Macro tracking', description: 'Up to 2 points each day you log meals' },
  { key: 'workouts', label: 'Training', description: '1 point on active days, up to 5 each week' },
  { key: 'weighIns', label: 'Weekly weigh-ins', description: '1 private consistency point each week' },
  { key: 'finalScan', label: 'Final scan', description: '5 points once your final scan is verified' },
  { key: 'bodyFat', label: 'Body-fat points', description: 'Private scan-to-scan improvement points' },
  { key: 'muscle', label: 'Muscle points', description: 'Private scan-to-scan improvement points' },
]

export default function Fuel42ChallengePage() {
  const router = useRouter()
  const [data, setData] = useState<Leaderboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/challenges/fuel42/leaderboard')
      .then(async response => {
        if (!response.ok) throw new Error((await response.json()).error || 'Unable to load FUEL 42.')
        return response.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [])

  if (error) return <main className="min-h-screen bg-slate-950 p-6 text-white"><button onClick={() => router.push('/athlete/dashboard')} className="text-emerald-300">← Dashboard</button><p className="mt-8 text-slate-300">{error}</p></main>
  if (!data?.me) return <main className="min-h-screen bg-slate-950 p-6 text-white"><p className="text-slate-300">Loading FUEL 42…</p></main>

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-12">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4"><button onClick={() => router.push('/athlete/dashboard')} className="text-xl text-slate-300">←</button><div><p className="text-[10px] font-bold tracking-[0.18em] text-emerald-400">FUEL 42 · SEPT 14–OCT 25</p><h1 className="text-xl font-bold">Challenge Progress</h1></div></div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <section className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/10 via-slate-900 to-purple-500/10 p-6">
          <p className="text-sm text-slate-300">Your FUEL 42 total</p>
          <div className="mt-1 flex items-end justify-between"><p className="text-5xl font-black text-emerald-300">{data.me.points.total}</p><p className="pb-1 text-sm font-semibold text-slate-300">{data.me.rank ? `Rank #${data.me.rank}` : 'Private leaderboard status'}</p></div>
          <button onClick={() => router.push('/athlete/challenge/intake')} className="mt-5 rounded-lg border border-emerald-400/40 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-400/10">Challenge Settings & Goals</button>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="font-bold text-white">Your Points</h2>
          <div className="mt-4 divide-y divide-slate-800">
            {pointRows.map(row => <div key={row.key} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-semibold text-slate-100">{row.label}</p><p className="mt-0.5 text-xs text-slate-400">{row.description}</p></div><p className="text-lg font-bold text-emerald-300">{data.me!.points[row.key]}</p></div>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Your weight, body-fat percentage, scan values, and personal goals are private. Other participants see only your display name, rank, and total points when you choose to appear.</p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold text-white">Leaderboard</h2><span className="text-xs text-slate-400">Consistency wins</span></div>
          {data.entries.length === 0 ? <p className="mt-5 text-sm text-slate-400">The leaderboard will fill as participants complete their FUEL 42 intake.</p> : <div className="mt-4 space-y-2">{data.entries.map(entry => <div key={`${entry.rank}-${entry.displayName}`} className="flex items-center justify-between rounded-xl bg-slate-800/70 px-4 py-3"><div className="flex items-center gap-3"><span className="w-6 text-center font-black text-emerald-300">{entry.rank}</span><span className="font-semibold text-slate-100">{entry.displayName}</span></div><span className="font-bold text-white">{entry.points.total} pts</span></div>)}</div>}
        </section>
      </div>
    </main>
  )
}
