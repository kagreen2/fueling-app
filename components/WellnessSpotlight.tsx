'use client'

import React, { useMemo } from 'react'

interface CheckinData {
  date: string
  wellness_score: number | null
}

interface WellnessSpotlightProps {
  checkins: CheckinData[]
  compact?: boolean
  role?: 'athlete' | 'coach'
}

// Score zones with emoji, color, and label
function getZone(score: number) {
  if (score >= 80) return { emoji: '🔥', label: 'Excellent', color: 'text-green-400', bg: 'bg-green-400', border: 'border-green-500/30', barColor: 'bg-green-400' }
  if (score >= 60) return { emoji: '💪', label: 'Good', color: 'text-blue-400', bg: 'bg-blue-400', border: 'border-blue-500/30', barColor: 'bg-blue-400' }
  if (score >= 40) return { emoji: '⚠️', label: 'Fair', color: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-500/30', barColor: 'bg-amber-400' }
  return { emoji: '🚨', label: 'Low', color: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30', barColor: 'bg-red-400' }
}

function getAthleteInsight(avg: number | null, trend: 'up' | 'down' | 'stable'): string {
  if (avg === null) return ''

  if (avg >= 80 && trend === 'up') {
    return 'You\'re in the zone. Your body is primed for peak performance — keep doing what you\'re doing.'
  }
  if (avg >= 80) {
    return 'Great recovery. You\'re in the optimal zone for training hard and making gains.'
  }
  if (avg >= 60 && trend === 'up') {
    return 'Trending up — you\'re building momentum. Keep prioritizing sleep and nutrition to break into the 80+ zone.'
  }
  if (avg >= 60 && trend === 'down') {
    return 'Your score is slipping. Focus on sleep, hydration, and recovery to get back on track.'
  }
  if (avg >= 60) {
    return 'Solid foundation. Dialing in sleep and hydration can push you into the optimal 80+ zone.'
  }
  if (avg >= 40 && trend === 'down') {
    return 'Your body is showing signs of stress. Prioritize rest and recovery to avoid setbacks.'
  }
  if (avg >= 40) {
    return 'Your recovery needs attention. Better sleep and nutrition will help you bounce back faster.'
  }
  if (trend === 'down') {
    return 'Your Fuel Score is critically low. Talk to your coach — rest and recovery should be the priority right now.'
  }
  return 'Your body is under a lot of stress. Focus on rest, nutrition, and hydration before pushing hard in training.'
}

function getCoachInsight(avg: number | null, trend: 'up' | 'down' | 'stable'): string {
  if (avg === null) return ''

  if (avg >= 80) {
    return 'Optimal recovery state. Low injury risk — good window for progressive overload.'
  }
  if (avg >= 60 && trend === 'down') {
    return 'Wellness declining. Monitor training load — continued decline increases injury risk.'
  }
  if (avg >= 60) {
    return 'Adequate recovery. Sleep and nutrition improvements could push into optimal zone.'
  }
  if (avg >= 40) {
    return 'Elevated risk zone. Consider reducing training intensity and reviewing nutrition plan.'
  }
  return 'Critical wellness level. High injury risk. Recommend reduced volume and direct check-in.'
}

export default function WellnessSpotlight({ checkins, compact = false, role = 'athlete' }: WellnessSpotlightProps) {
  const { todayScore, avg7, trend, last7Scores } = useMemo(() => {
    const sorted = [...checkins]
      .filter(c => c.wellness_score !== null && c.wellness_score !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const today = sorted[0]?.wellness_score ?? null

    const last7 = sorted.slice(0, 7)
    const last7Scores = last7.map(c => c.wellness_score as number).reverse()

    const avg7 = last7.length > 0
      ? Math.round(last7.reduce((sum, c) => sum + (c.wellness_score || 0), 0) / last7.length)
      : null

    const prev7 = sorted.slice(7, 14)
    const avg7Prev = prev7.length > 0
      ? Math.round(prev7.reduce((sum, c) => sum + (c.wellness_score || 0), 0) / prev7.length)
      : null

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (avg7 !== null && avg7Prev !== null) {
      const diff = avg7 - avg7Prev
      if (diff >= 5) trend = 'up'
      else if (diff <= -5) trend = 'down'
      else trend = 'stable'
    }

    return { todayScore: today, avg7, trend, last7Scores }
  }, [checkins])

  // Compact mode for coach table
  if (compact) {
    if (avg7 === null) return <span className="text-slate-500 text-sm">—</span>
    const zone = getZone(avg7)
    return (
      <div className="flex items-center gap-1.5">
        <span className={`font-bold text-sm ${zone.color}`}>{avg7}</span>
        {trend === 'up' && <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>}
        {trend === 'down' && <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>}
        {trend === 'stable' && <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" /></svg>}
      </div>
    )
  }

  // Empty state
  if (avg7 === null && todayScore === null) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-white mb-2">⚡ Fuel Score</h4>
        <p className="text-slate-400 text-sm">Complete your daily check-in to see your Fuel Score.</p>
        <p className="text-slate-500 text-xs mt-2">Your Fuel Score reflects how well you're fueling your body — energy, stress, soreness, and hydration combined into one number that drives your performance.</p>
      </div>
    )
  }

  const displayScore = todayScore ?? avg7 ?? 0
  const zone = getZone(displayScore)
  const insight = role === 'coach' ? getCoachInsight(avg7, trend) : getAthleteInsight(avg7, trend)

  // Gauge bar position (0-100 mapped to percentage)
  const gaugePercent = Math.min(100, Math.max(0, displayScore))

  return (
    <div className={`bg-slate-800/50 border rounded-xl p-5 ${zone.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">⚡ Fuel Score</h4>
        {avg7 !== null && todayScore !== null && avg7 !== todayScore && (
          <span className="text-xs text-slate-500">7-day avg: {avg7}</span>
        )}
      </div>

      {/* Score + Emoji + Label */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{zone.emoji}</span>
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${zone.color}`}>{displayScore}</span>
            <span className={`text-lg font-semibold ${zone.color}`}>{zone.label}</span>
          </div>
          {/* Trend indicator */}
          <div className="flex items-center gap-1 mt-0.5">
            {trend === 'up' && (
              <span className="text-xs text-green-400 flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                Trending up
              </span>
            )}
            {trend === 'down' && (
              <span className="text-xs text-red-400 flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                Trending down
              </span>
            )}
            {trend === 'stable' && (
              <span className="text-xs text-slate-400">Stable</span>
            )}
          </div>
        </div>
      </div>

      {/* Visual gauge bar */}
      <div className="mb-1">
        <div className="relative h-3 rounded-full overflow-hidden bg-slate-700">
          {/* Zone backgrounds */}
          <div className="absolute inset-0 flex">
            <div className="w-[40%] bg-red-500/20" />
            <div className="w-[20%] bg-amber-500/20" />
            <div className="w-[20%] bg-blue-500/20" />
            <div className="w-[20%] bg-green-500/20" />
          </div>
          {/* Score position indicator */}
          <div
            className={`absolute top-0 h-full rounded-full ${zone.barColor} transition-all duration-500`}
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
        {/* Zone labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          <span className="text-[10px] text-red-400/60">Low</span>
          <span className="text-[10px] text-amber-400/60">Fair</span>
          <span className="text-[10px] text-blue-400/60">Good</span>
          <span className="text-[10px] text-green-400/60">Optimal</span>
        </div>
      </div>

      {/* Target callout */}
      <p className="text-[11px] text-slate-500 mt-2 mb-3">
        🎯 <span className="text-green-400/80 font-medium">80+</span> is the target zone — where recovery, performance, and body comp gains are maximized.
      </p>

      {/* Sparkline (if 2+ days of data) */}
      {last7Scores.length >= 2 && (
        <div className="mb-3 pt-3 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">Last {last7Scores.length} Days</p>
          <div className="flex items-end gap-1.5 h-8">
            {last7Scores.map((score, i) => {
              const isToday = i === last7Scores.length - 1
              const barH = Math.max(4, (score / 100) * 32)
              const barZone = getZone(score)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-sm transition-all ${isToday ? barZone.barColor : 'bg-slate-600'} ${isToday ? 'opacity-100' : 'opacity-50'}`}
                    style={{ height: `${barH}px` }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Insight */}
      {insight && (
        <div className="pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-400 leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  )
}

// Compact inline component for use in table headers or small spaces
export function WellnessAvgBadge({ avg, trend }: { avg: number | null; trend?: 'up' | 'down' | 'stable' }) {
  if (avg === null) return <span className="text-slate-500">—</span>
  const zone = getZone(avg)
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${zone.color}`}>
      {avg}
      {trend === 'up' && <span className="text-green-400 text-xs">&#9650;</span>}
      {trend === 'down' && <span className="text-red-400 text-xs">&#9660;</span>}
      {trend === 'stable' && <span className="text-slate-400 text-xs">&#9644;</span>}
    </span>
  )
}
