'use client'

import { useMemo, useState } from 'react'

interface ScanData {
  scan_date: string
  weight_lbs: number | null
  fat_free_mass_lbs: number | null
  body_fat_mass_lbs: number | null
  percent_body_fat: number | null
  skeletal_muscle_mass_lbs: number | null
}

interface InBodyProgressChartsProps {
  scans: ScanData[]
  compact?: boolean
}

type MetricKey = 'weight_lbs' | 'fat_free_mass_lbs' | 'body_fat_mass_lbs' | 'percent_body_fat' | 'skeletal_muscle_mass_lbs'

interface MetricConfig {
  key: MetricKey
  label: string
  shortLabel: string
  unit: string
  color: string
  tailwindText: string
  tailwindBg: string
  lowerIsBetter: boolean
}

const METRICS: MetricConfig[] = [
  { key: 'weight_lbs', label: 'Weight', shortLabel: 'Weight', unit: 'lbs', color: '#f1f5f9', tailwindText: 'text-slate-100', tailwindBg: 'bg-slate-400/10', lowerIsBetter: false },
  { key: 'fat_free_mass_lbs', label: 'Lean Body Mass', shortLabel: 'LBM', unit: 'lbs', color: '#22c55e', tailwindText: 'text-green-400', tailwindBg: 'bg-green-500/10', lowerIsBetter: false },
  { key: 'body_fat_mass_lbs', label: 'Fat Mass', shortLabel: 'Fat', unit: 'lbs', color: '#ef4444', tailwindText: 'text-red-400', tailwindBg: 'bg-red-500/10', lowerIsBetter: true },
  { key: 'percent_body_fat', label: 'Body Fat %', shortLabel: 'BF%', unit: '%', color: '#a855f7', tailwindText: 'text-purple-400', tailwindBg: 'bg-purple-500/10', lowerIsBetter: true },
  { key: 'skeletal_muscle_mass_lbs', label: 'Skeletal Muscle', shortLabel: 'SMM', unit: 'lbs', color: '#3b82f6', tailwindText: 'text-blue-400', tailwindBg: 'bg-blue-500/10', lowerIsBetter: false },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TrendChart({ scans, metric, compact }: { scans: ScanData[]; metric: MetricConfig; compact?: boolean }) {
  const dataPoints = useMemo(() => {
    return scans
      .map(s => ({ date: s.scan_date, value: s[metric.key] as number | null }))
      .filter(d => d.value != null && d.value > 0) as { date: string; value: number }[]
  }, [scans, metric.key])

  if (dataPoints.length < 2) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: metric.color }} />
          <span className="text-[13px] text-slate-400 font-semibold">{metric.label}</span>
        </div>
        <p className="text-xs text-slate-600">
          {dataPoints.length === 0 ? 'No data yet' : 'Need at least 2 scans to show trends'}
        </p>
        {dataPoints.length === 1 && (
          <p className={`text-xl font-bold tabular-nums mt-1 ${metric.tailwindText}`}>
            {dataPoints[0].value.toFixed(1)} <span className="text-xs text-slate-500">{metric.unit}</span>
          </p>
        )}
      </div>
    )
  }

  const values = dataPoints.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const padding = range * 0.1

  const chartWidth = 300
  const chartHeight = compact ? 80 : 100
  const paddingX = 0
  const paddingY = 8

  const points = dataPoints.map((d, i) => ({
    x: paddingX + (i / (dataPoints.length - 1)) * (chartWidth - 2 * paddingX),
    y: paddingY + (1 - (d.value - (min - padding)) / (range + 2 * padding)) * (chartHeight - 2 * paddingY),
    value: d.value,
    date: d.date,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`

  const latest = dataPoints[dataPoints.length - 1]
  const first = dataPoints[0]
  const totalChange = latest.value - first.value
  const isImproved = metric.lowerIsBetter ? totalChange < 0 : totalChange > 0
  const changeColor = Math.abs(totalChange) < 0.1 ? 'text-slate-500' : isImproved ? 'text-green-400' : 'text-red-400'
  const changePrefix = totalChange > 0 ? '+' : ''

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: metric.color }} />
          <span className="text-[13px] text-slate-400 font-semibold">{metric.label}</span>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold tabular-nums ${metric.tailwindText}`}>
            {latest.value.toFixed(1)}
          </span>
          <span className="text-[11px] text-slate-500 ml-1">{metric.unit}</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className={compact ? 'w-full h-[60px] block' : 'w-full h-[80px] block'}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={metric.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${metric.key})`} />
        <path d={linePath} fill="none" stroke={metric.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={metric.color} stroke={i === points.length - 1 ? '#0f172a' : 'none'} strokeWidth={i === points.length - 1 ? 2 : 0} />
        ))}
      </svg>

      <div className="flex justify-between items-center mt-2">
        <span className="text-[10px] text-slate-600">
          {formatDate(first.date)} — {formatDate(latest.date)}
        </span>
        <span className={`text-[11px] font-semibold tabular-nums ${changeColor}`}>
          {changePrefix}{totalChange.toFixed(1)} {metric.unit}
        </span>
      </div>
    </div>
  )
}

function SummaryCard({ scans, metric }: { scans: ScanData[]; metric: MetricConfig }) {
  const dataPoints = scans
    .map(s => ({ value: s[metric.key] as number | null }))
    .filter(d => d.value != null && d.value > 0) as { value: number }[]

  if (dataPoints.length === 0) return null

  const latest = dataPoints[dataPoints.length - 1].value
  const previous = dataPoints.length >= 2 ? dataPoints[dataPoints.length - 2].value : null
  const change = previous != null ? latest - previous : null
  const isImproved = change != null && (metric.lowerIsBetter ? change < 0 : change > 0)
  const changeColor = change == null || Math.abs(change) < 0.05 ? 'text-slate-500' : isImproved ? 'text-green-400' : 'text-red-400'
  const arrow = change != null ? (change > 0 ? '▲' : change < 0 ? '▼' : '●') : ''

  return (
    <div className={`${metric.tailwindBg} border border-white/5 rounded-lg p-3 text-center`}>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{metric.shortLabel}</div>
      <div className={`text-lg font-bold tabular-nums ${metric.tailwindText}`}>{latest.toFixed(1)}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{metric.unit}</div>
      {change != null && (
        <div className={`text-[11px] tabular-nums mt-1 ${changeColor}`}>
          {arrow} {Math.abs(change).toFixed(1)}
        </div>
      )}
    </div>
  )
}

export default function InBodyProgressCharts({ scans, compact = false }: InBodyProgressChartsProps) {
  const [showAll, setShowAll] = useState(false)

  const sortedScans = useMemo(() => {
    return [...scans].sort((a, b) => a.scan_date.localeCompare(b.scan_date))
  }, [scans])

  if (sortedScans.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">📊</div>
        <p className="text-slate-500 text-sm">No InBody scans yet</p>
        <p className="text-slate-600 text-xs mt-1">Add your first scan to start tracking body composition trends</p>
      </div>
    )
  }

  const primaryMetrics = METRICS.slice(0, 4)
  const secondaryMetrics = METRICS.slice(4)

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`${compact ? 'text-[15px]' : 'text-lg'} font-bold text-slate-100`}>
            Body Composition Trends
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {sortedScans.length} scan{sortedScans.length !== 1 ? 's' : ''} · {formatDateFull(sortedScans[0].scan_date)} — {formatDateFull(sortedScans[sortedScans.length - 1].scan_date)}
          </p>
        </div>
      </div>

      {/* Summary cards — responsive: 3 cols mobile, 5 cols desktop */}
      <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'} gap-2 mb-4`}>
        {(compact ? primaryMetrics : METRICS).map(m => (
          <SummaryCard key={m.key} scans={sortedScans} metric={m} />
        ))}
      </div>

      {/* Trend charts — 1 col mobile, 2 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {primaryMetrics.map(m => (
          <TrendChart key={m.key} scans={sortedScans} metric={m} compact={compact} />
        ))}
      </div>

      {/* Show more toggle */}
      {!compact && secondaryMetrics.length > 0 && (
        <>
          {showAll && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {secondaryMetrics.map(m => (
                <TrendChart key={m.key} scans={sortedScans} metric={m} />
              ))}
            </div>
          )}
          <button
            onClick={() => setShowAll(!showAll)}
            className="block mx-auto mt-3 bg-transparent border border-white/10 text-slate-400 text-xs px-4 py-1.5 rounded-full hover:border-white/20 hover:text-slate-300 transition-colors"
          >
            {showAll ? 'Show less' : 'Show more metrics'}
          </button>
        </>
      )}
    </div>
  )
}
