'use client'

import React, { useMemo } from 'react'
import { getZoneInfo } from '@/lib/fuel-score'

interface CheckinData {
  date: string
  wellness_score: number | null
}

interface WellnessSpotlightProps {
  checkins: CheckinData[]
  compact?: boolean
  role?: 'athlete' | 'coach'
  streak?: number
  onScoreClick?: (date: string) => void
}

function getAthleteInsight(avg: number | null, trend: 'up' | 'down' | 'stable'): string {
  if (avg === null) return ''

  if (avg >= 85 && trend === 'up') {
    return 'You\'re Locked In. Your body is primed for peak performance — keep doing what you\'re doing.'
  }
  if (avg >= 85) {
    return 'Locked In. You\'re in the optimal zone for training hard and making gains.'
  }
  if (avg >= 70 && trend === 'up') {
    return 'Trending up — you\'re building momentum. Keep prioritizing sleep and nutrition to get Locked In.'
  }
  if (avg >= 70 && trend === 'down') {
    return 'Your score is slipping. Focus on sleep, hydration, and recovery to stay On Track.'
  }
  if (avg >= 70) {
    return 'You\'re On Track. Dialing in sleep and hydration can push you into the Locked In zone.'
  }
  if (avg >= 50 && trend === 'down') {
    return 'Dial It In — your body is showing signs of stress. Prioritize rest and recovery to avoid setbacks.'
  }
  if (avg >= 50) {
    return 'Dial It In. Your recovery needs attention. Better sleep and nutrition will help you bounce back.'
  }
  if (trend === 'down') {
    return 'Red Flag — your Fuel Score is critically low. Talk to your coach. Rest and recovery should be the priority right now.'
  }
  return 'Red Flag. Your body is under a lot of stress. Focus on rest, nutrition, and hydration before pushing hard in training.'
}

function getCoachInsight(avg: number | null, trend: 'up' | 'down' | 'stable'): string {
  if (avg === null) return ''

  if (avg >= 85) {
    return 'Locked In — optimal recovery state. Low injury risk. Good window for progressive overload.'
  }
  if (avg >= 70 && trend === 'down') {
    return 'On Track but declining. Monitor training load — continued decline increases injury risk.'
  }
  if (avg >= 70) {
    return 'On Track. Sleep and nutrition improvements could push into the Locked In zone.'
  }
  if (avg >= 50) {
    return 'Dial It In zone. Consider reducing training intensity and reviewing nutrition plan.'
  }
  return 'Red Flag — critical wellness level. High injury risk. Recommend reduced volume and direct check-in.'
}

export default function WellnessSpotlight({ checkins, compact = false, role = 'athlete', streak = 0, onScoreClick }: WellnessSpotlightProps) {
  const { todayScore, avg7, trend, last7Scores, yesterdayScore, last4Dates } = useMemo(() => {
    const sorted = [...checkins]
      .filter(c => c.wellness_score !== null && c.wellness_score !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const today = sorted[0]?.wellness_score ?? null
    const yesterday = sorted[1]?.wellness_score ?? null

    const last7 = sorted.slice(0, 7)
    const last7Scores = last7.map(c => c.wellness_score as number).reverse()
    const last4Dates = last7.slice(-4).map(c => c.date).reverse()

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

    return { todayScore: today, avg7, trend, last7Scores, yesterdayScore: yesterday, last4Dates }
  }, [checkins])

  // Compact mode for coach table — number + trend arrow only
  if (compact) {
    if (avg7 === null) return <span className="text-slate-500 text-sm">—</span>
    const zone = getZoneInfo(avg7)

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
  const zone = getZoneInfo(displayScore)
  const insight = role === 'coach' ? getCoachInsight(avg7, trend) : getAthleteInsight(avg7, trend)

  // Day-over-day change
  const dayChange = (todayScore !== null && yesterdayScore !== null) ? todayScore - yesterdayScore : null

  // Gauge bar position (0-100 mapped to percentage)
  const gaugePercent = Math.min(100, Math.max(0, displayScore))

  return (
    <div className={`bg-slate-800/50 border rounded-xl p-5 ${zone.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">⚡ Fuel Score</h4>
        <div className="flex items-center gap-3">
          {streak >= 5 && (
            <span className="text-xs text-orange-400 flex items-center gap-1">
              🔥 {streak}-day streak {streak >= 14 ? '(+5)' : streak >= 7 ? '(+4)' : streak >= 6 ? '(+3)' : '(+2)'}
            </span>
          )}
          {avg7 !== null && todayScore !== null && avg7 !== todayScore && (
            <span className="text-xs text-slate-500">7-day avg: {avg7}</span>
          )}
        </div>
      </div>

      {/* Score + Emoji + Label */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{zone.emoji}</span>
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${zone.color}`}>{displayScore}</span>
            <span className={`text-lg font-semibold ${zone.color}`}>{zone.label}</span>
          </div>
          {/* Trend indicator with day-over-day change */}
          <div className="flex items-center gap-2 mt-0.5">
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
            {dayChange !== null && dayChange !== 0 && (
              <span className={`text-xs ${dayChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {dayChange > 0 ? '+' : ''}{dayChange} from yesterday
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual gauge bar */}
      <div className="mb-1">
        <div className="relative h-3 rounded-full overflow-hidden bg-slate-700">
          {/* Zone backgrounds */}
          <div className="absolute inset-0 flex">
            <div className="w-[50%] bg-red-500/20" />
            <div className="w-[20%] bg-amber-500/20" />
            <div className="w-[15%] bg-blue-500/20" />
            <div className="w-[15%] bg-green-500/20" />
          </div>
          {/* Score position indicator */}
          <div
            className={`absolute top-0 h-full rounded-full ${zone.barColor} transition-all duration-500`}
            style={{ width: `${gaugePercent}%` }}
          />
        </div>
        {/* Zone labels */}
        <div className="flex mt-1.5 px-0.5">
          <span className="w-[50%] text-[10px] text-red-400/60">Red Flag</span>
          <span className="w-[20%] text-[10px] text-amber-400/60">Dial It In</span>
          <span className="w-[15%] text-[10px] text-blue-400/60">On Track</span>
          <span className="w-[15%] text-[10px] text-green-400/60 text-right">Locked In</span>
        </div>
      </div>

      {/* Target callout */}
      <p className="text-[11px] text-slate-500 mt-2 mb-3">
        🎯 <span className="text-green-400/80 font-medium">85+</span> is the Locked In zone — where recovery, performance, and body comp gains are maximized.
      </p>

      {/* Last 4 Days as colored score circles */}
      {last7Scores.length >= 2 && (() => {
        const last4 = last7Scores.slice(-4)
        const getCircleClasses = (score: number) => {
          if (score >= 85) return 'border-green-400 text-green-400'
          if (score >= 70) return 'border-blue-400 text-blue-400'
          if (score >= 50) return 'border-amber-400 text-amber-400'
          return 'border-red-400 text-red-400'
        }
        const getRingClass = (score: number) => {
          if (score >= 85) return 'ring-green-400/40'
          if (score >= 70) return 'ring-blue-400/40'
          if (score >= 50) return 'ring-amber-400/40'
          return 'ring-red-400/40'
        }
        return (
          <div className="mb-3 pt-3 border-t border-slate-700/50">
            <p className="text-[10px] text-slate-500 mb-3 uppercase tracking-wider">Last {last4.length} Days</p>
            <div className="flex items-center justify-between gap-3">
              {last4.map((score, i) => {
                const isLatest = i === last4.length - 1
                const date = last4Dates[i]
                return (
                  <button
                    key={i}
                    onClick={() => onScoreClick?.(date)}
                    className="flex flex-col items-center gap-1 hover:opacity-100 transition-opacity"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2 ${getCircleClasses(score)} ${
                        isLatest ? `ring-2 ring-offset-2 ring-offset-slate-800 ${getRingClass(score)}` : 'opacity-75'
                      } hover:opacity-100 cursor-pointer transition-opacity`}
                    >
                      {score}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

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
  const zone = getZoneInfo(avg)
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${zone.color}`}>
      {avg}
      {trend === 'up' && <span className="text-green-400 text-xs">&#9650;</span>}
      {trend === 'down' && <span className="text-red-400 text-xs">&#9660;</span>}
      {trend === 'stable' && <span className="text-slate-400 text-xs">&#9644;</span>}
    </span>
  )
}
