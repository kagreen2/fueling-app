'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type LeaderboardResponse = {
  entries: Array<{ rank: number; displayName: string; points: { total: number } }>
  me: null | { rank: number | null; isVisible: boolean; displayName: string; points: { total: number } }
}

export default function Fuel42LeaderboardCard() {
  const router = useRouter()
  const [data, setData] = useState<LeaderboardResponse | null>(null)

  useEffect(() => {
    fetch('/api/challenges/fuel42/leaderboard')
      .then(async response => response.ok ? response.json() : null)
      .then(result => setData(result))
      .catch(() => setData(null))
  }, [])

  if (!data?.me) return null
  const preview = data.entries.slice(0, 3)
  return (
    <section className="mb-6 border border-emerald-400/30 bg-gradient-to-br from-emerald-400/10 via-slate-900 to-purple-500/10 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-emerald-300">FUEL 42 · SEPT 14–OCT 25</p>
            <h2 className="mt-1 text-xl font-bold text-white">Challenge Leaderboard</h2>
            <p className="mt-1 text-sm text-slate-300">Consistency points only. Your health details stay private.</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-black text-emerald-300">{data.me.points.total}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points</p>
          </div>
        </div>

        {data.me.rank ? (
          <p className="mt-4 text-sm text-slate-200">You are currently <span className="font-bold text-white">#{data.me.rank}</span> on the leaderboard.</p>
        ) : (
          <p className="mt-4 text-sm text-slate-200">Your points are tracking privately. Turn on leaderboard visibility in Challenge Settings whenever you are ready.</p>
        )}

        {preview.length > 0 && (
          <div className="mt-4 space-y-2">
            {preview.map(entry => (
              <div key={`${entry.rank}-${entry.displayName}`} className="flex items-center justify-between border-t border-slate-700/60 pt-2 text-sm">
                <span className="text-slate-300"><span className="mr-2 font-bold text-emerald-300">#{entry.rank}</span>{entry.displayName}</span>
                <span className="font-semibold text-white">{entry.points.total} pts</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => router.push('/athlete/challenge')} className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition-transform active:scale-[0.98] hover:bg-emerald-300">
          View Challenge Progress
        </button>
      </div>
    </section>
  )
}
