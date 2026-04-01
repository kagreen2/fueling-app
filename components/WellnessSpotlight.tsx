'use client'

import React, { useMemo } from 'react'

interface CheckinData {
  date: string
  wellness_score: number | null
}

interface WellnessSpotlightProps {
  checkins: CheckinData[]
  compact?: boolean // compact mode for coach table cells
  role?: 'athlete' | 'coach' // controls messaging tone
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-400'
  if (score >= 60) return 'bg-yellow-400'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

function getScoreBorder(score: number): string {
  if (score >= 80) return 'border-green-500/30'
  if (score >= 60) return 'border-yellow-500/30'
  if (score >= 40) return 'border-amber-500/30'
  return 'border-red-500/30'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Attention'
}

function getAthleteInsight(avg: number | null, trend: 'up' | 'down' | 'stable'): { message: string; icon: string } {
  if (avg === null) return { message: '', icon: '' }

  if (avg >= 80 && trend === 'up') {
    return {
      icon: '🟢',
      message: 'Your wellness is strong — you\'re primed for peak performance and progress toward your body composition goals.',
    }
  }
  if (avg >= 80) {
    return {
      icon: '🟢',
      message: 'Great recovery. High wellness scores like yours correlate with lower injury risk and better training adaptations.',
    }
  }
  if (avg >= 60 && trend === 'up') {
    return {
      icon: '📈',
      message: 'Trending in the right direction. Keep prioritizing sleep and nutrition — consistency here drives performance gains.',
    }
  }
  if (avg >= 60 && trend === 'down') {
    return {
      icon: '⚠️',
      message: 'Your wellness is slipping. Declining scores are linked to slower recovery, reduced performance, and stalled body composition progress.',
    }
  }
  if (avg >= 60) {
    return {
      icon: '💪',
      message: 'Solid foundation. Dialing in sleep and hydration from here can unlock the next level of performance and results.',
    }
  }
  if (avg >= 40 && trend === 'down') {
    return {
      icon: '🔻',
      message: 'Your body is showing signs of accumulated stress. Athletes in this range face higher injury risk and diminished returns from training. Prioritize recovery.',
    }
  }
  if (avg >= 40) {
    return {
      icon: '⚠️',
      message: 'Your recovery needs attention. Sustained scores in this range can slow progress toward body composition goals and increase injury vulnerability.',
    }
  }
  // Below 40
  if (trend === 'down') {
    return {
      icon: '🚨',
      message: 'Critical: Your wellness is significantly low and declining. Research shows this level of stress dramatically increases injury risk and halts performance gains. Talk to your coach.',
    }
  }
  return {
    icon: '🚨',
    message: 'Your body is under significant stress. Low wellness scores are strongly linked to increased injury risk, poor recovery, and stalled body composition goals. Prioritize rest, nutrition, and hydration.',
  }
}

function getCoachInsight(avg: number | null, trend: 'up' | 'down' | 'stable'): { message: string; icon: string } {
  if (avg === null) return { message: '', icon: '' }

  if (avg >= 80) {
    return {
      icon: '🟢',
      message: 'Athlete is in an optimal recovery state. Low injury risk — good window for progressive overload.',
    }
  }
  if (avg >= 60 && trend === 'down') {
    return {
      icon: '⚠️',
      message: 'Wellness declining. Monitor training load — continued decline correlates with increased injury risk and reduced training adaptations.',
    }
  }
  if (avg >= 60) {
    return {
      icon: '📊',
      message: 'Adequate recovery. Consistent nutrition and sleep improvements could push this athlete into the optimal zone.',
    }
  }
  if (avg >= 40) {
    return {
      icon: '⚠️',
      message: 'Elevated risk zone. Athletes sustaining scores in this range show higher injury rates and diminished body composition progress. Consider reducing training intensity.',
    }
  }
  return {
    icon: '🚨',
    message: 'Critical wellness level. High injury risk. Recommend reducing training volume, reviewing nutrition plan, and checking in with athlete directly.',
  }
}

export default function WellnessSpotlight({ checkins, compact = false, role = 'athlete' }: WellnessSpotlightProps) {
  const { todayScore, avg7, trend, last7Scores } = useMemo(() => {
    // Sort by date descending
    const sorted = [...checkins]
      .filter(c => c.wellness_score !== null && c.wellness_score !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const today = sorted[0]?.wellness_score ?? null

    // Last 7 days
    const last7 = sorted.slice(0, 7)
    const last7Scores = last7.map(c => c.wellness_score as number).reverse() // oldest to newest for sparkline

    const avg7 = last7.length > 0
      ? Math.round(last7.reduce((sum, c) => sum + (c.wellness_score || 0), 0) / last7.length)
      : null

    // Previous 7 days (days 8-14) for trend comparison
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

  // Compact mode for coach table — just show avg + trend inline
  if (compact) {
    if (avg7 === null) return <span className="text-slate-500 text-sm">—</span>
    return (
      <div className="flex items-center gap-1.5">
        <span className={`font-bold text-sm ${getScoreColor(avg7)}`}>{avg7}</span>
        {trend === 'up' && <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>}
        {trend === 'down' && <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>}
        {trend === 'stable' && <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" /></svg>}
      </div>
    )
  }

  // Full mode for athlete dashboard / coach detail page
  if (avg7 === null && todayScore === null) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Wellness Score</h4>
        <p className="text-slate-500 text-sm">No check-in data yet. Complete your daily check-in to start tracking your wellness.</p>
        <p className="text-slate-600 text-xs mt-2 italic">Your wellness score reflects your recovery, stress, sleep, and energy — key indicators of injury risk and progress toward your goals.</p>
      </div>
    )
  }

  const insight = role === 'coach'
    ? getCoachInsight(avg7, trend)
    : getAthleteInsight(avg7, trend)

  // Sparkline dimensions
  const sparkW = 140
  const sparkH = 36
  const maxScore = 100
  const minDisplay = 20

  return (
    <div className={`bg-slate-800/50 border rounded-xl p-5 ${avg7 !== null ? getScoreBorder(avg7) : 'border-slate-700'}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Wellness Score</h4>
        <span className="text-[10px] text-slate-600 uppercase tracking-wider">Injury Risk &middot; Performance &middot; Body Comp</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        {/* Left: Today + 7-Day Average */}
        <div className="flex gap-6">
          {/* Today */}
          {todayScore !== null && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Today</p>
              <p className={`text-3xl font-bold ${getScoreColor(todayScore)}`}>{todayScore}</p>
              <p className={`text-xs mt-0.5 ${getScoreColor(todayScore)}`}>{getScoreLabel(todayScore)}</p>
            </div>
          )}

          {/* 7-Day Average */}
          {avg7 !== null && (
            <div>
              <p className="text-xs text-slate-500 mb-1">7-Day Avg</p>
              <div className="flex items-center gap-2">
                <p className={`text-3xl font-bold ${getScoreColor(avg7)}`}>{avg7}</p>
                <div className="flex flex-col items-center">
                  {trend === 'up' && (
                    <div className="flex items-center gap-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      <span className="text-[10px] text-green-400 font-medium">UP</span>
                    </div>
                  )}
                  {trend === 'down' && (
                    <div className="flex items-center gap-0.5">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      <span className="text-[10px] text-red-400 font-medium">DOWN</span>
                    </div>
                  )}
                  {trend === 'stable' && (
                    <div className="flex items-center gap-0.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" /></svg>
                      <span className="text-[10px] text-slate-400 font-medium">STABLE</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{getScoreLabel(avg7)}</p>
            </div>
          )}
        </div>

        {/* Right: Sparkline */}
        {last7Scores.length >= 2 && (
          <div className="flex flex-col items-end">
            <p className="text-[10px] text-slate-500 mb-1">Last 7 Days</p>
            <svg width={sparkW} height={sparkH} className="overflow-visible">
              {last7Scores.map((score, i) => {
                const barW = (sparkW - (last7Scores.length - 1) * 3) / last7Scores.length
                const barH = Math.max(4, ((score - minDisplay) / (maxScore - minDisplay)) * sparkH)
                const x = i * (barW + 3)
                const y = sparkH - barH
                const isToday = i === last7Scores.length - 1

                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    rx={2}
                    className={`${isToday ? getScoreBg(score) : 'fill-slate-600'} ${isToday ? 'opacity-100' : 'opacity-60'}`}
                  />
                )
              })}
              {avg7 !== null && (
                <line
                  x1={0}
                  x2={sparkW}
                  y1={sparkH - Math.max(4, ((avg7 - minDisplay) / (maxScore - minDisplay)) * sparkH)}
                  y2={sparkH - Math.max(4, ((avg7 - minDisplay) / (maxScore - minDisplay)) * sparkH)}
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  className="text-purple-400 opacity-60"
                />
              )}
            </svg>
            <p className="text-[9px] text-slate-600 mt-0.5">— avg</p>
          </div>
        )}
      </div>

      {/* Contextual Insight */}
      {insight.message && (
        <div className={`mt-4 pt-3 border-t border-slate-700/50 flex items-start gap-2`}>
          <span className="text-sm flex-shrink-0 mt-0.5">{insight.icon}</span>
          <p className="text-xs text-slate-400 leading-relaxed">{insight.message}</p>
        </div>
      )}
    </div>
  )
}

// Compact inline component for use in table headers or small spaces
export function WellnessAvgBadge({ avg, trend }: { avg: number | null; trend?: 'up' | 'down' | 'stable' }) {
  if (avg === null) return <span className="text-slate-500">—</span>
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${getScoreColor(avg)}`}>
      {avg}
      {trend === 'up' && <span className="text-green-400 text-xs">&#9650;</span>}
      {trend === 'down' && <span className="text-red-400 text-xs">&#9660;</span>}
      {trend === 'stable' && <span className="text-slate-400 text-xs">&#9644;</span>}
    </span>
  )
}
