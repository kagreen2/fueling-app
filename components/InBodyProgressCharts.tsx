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
  /** Compact mode for embedding in dashboards */
  compact?: boolean
}

type MetricKey = 'weight_lbs' | 'fat_free_mass_lbs' | 'body_fat_mass_lbs' | 'percent_body_fat' | 'skeletal_muscle_mass_lbs'

interface MetricConfig {
  key: MetricKey
  label: string
  shortLabel: string
  unit: string
  color: string
  colorLight: string
  lowerIsBetter: boolean
}

const METRICS: MetricConfig[] = [
  { key: 'weight_lbs', label: 'Weight', shortLabel: 'Weight', unit: 'lbs', color: '#f1f5f9', colorLight: 'rgba(241,245,249,0.15)', lowerIsBetter: false },
  { key: 'fat_free_mass_lbs', label: 'Lean Body Mass', shortLabel: 'LBM', unit: 'lbs', color: '#22c55e', colorLight: 'rgba(34,197,94,0.15)', lowerIsBetter: false },
  { key: 'body_fat_mass_lbs', label: 'Fat Mass', shortLabel: 'Fat', unit: 'lbs', color: '#ef4444', colorLight: 'rgba(239,68,68,0.15)', lowerIsBetter: true },
  { key: 'percent_body_fat', label: 'Body Fat %', shortLabel: 'BF%', unit: '%', color: '#a855f7', colorLight: 'rgba(168,85,247,0.15)', lowerIsBetter: true },
  { key: 'skeletal_muscle_mass_lbs', label: 'Skeletal Muscle Mass', shortLabel: 'SMM', unit: 'lbs', color: '#3b82f6', colorLight: 'rgba(59,130,246,0.15)', lowerIsBetter: false },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * SVG-based line chart for a single metric
 */
function TrendChart({ scans, metric, compact }: { scans: ScanData[]; metric: MetricConfig; compact?: boolean }) {
  const dataPoints = useMemo(() => {
    return scans
      .map(s => ({ date: s.scan_date, value: s[metric.key] as number | null }))
      .filter(d => d.value != null && d.value > 0) as { date: string; value: number }[]
  }, [scans, metric.key])

  if (dataPoints.length < 2) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: compact ? '16px' : '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: metric.color }} />
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}>{metric.label}</span>
        </div>
        <p style={{ fontSize: '12px', color: '#4b5563' }}>
          {dataPoints.length === 0 ? 'No data yet' : 'Need at least 2 scans to show trends'}
        </p>
        {dataPoints.length === 1 && (
          <p style={{ fontSize: '20px', fontWeight: 700, color: metric.color, fontFamily: 'monospace', marginTop: '4px' }}>
            {dataPoints[0].value.toFixed(1)} <span style={{ fontSize: '12px', color: '#6b7280' }}>{metric.unit}</span>
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

  // Build SVG path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`

  const latest = dataPoints[dataPoints.length - 1]
  const first = dataPoints[0]
  const totalChange = latest.value - first.value
  const isImproved = metric.lowerIsBetter ? totalChange < 0 : totalChange > 0
  const changeColor = Math.abs(totalChange) < 0.1 ? '#6b7280' : isImproved ? '#22c55e' : '#ef4444'
  const changePrefix = totalChange > 0 ? '+' : ''

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: compact ? '16px' : '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? '8px' : '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: metric.color }} />
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}>{metric.label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: compact ? '18px' : '22px', fontWeight: 700, color: metric.color, fontFamily: 'monospace' }}>
            {latest.value.toFixed(metric.key === 'percent_body_fat' ? 1 : 1)}
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '3px' }}>{metric.unit}</span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: '100%', height: compact ? '60px' : '80px', display: 'block' }}
        preserveAspectRatio="none"
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={metric.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaPath} fill={`url(#grad-${metric.key})`} />
        {/* Line */}
        <path d={linePath} fill="none" stroke={metric.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={metric.color} stroke={i === points.length - 1 ? '#0f172a' : 'none'} strokeWidth={i === points.length - 1 ? 2 : 0} />
        ))}
      </svg>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '10px', color: '#4b5563' }}>
          {formatDate(first.date)} — {formatDate(latest.date)}
        </span>
        <span style={{ fontSize: '11px', color: changeColor, fontWeight: 600, fontFamily: 'monospace' }}>
          {changePrefix}{totalChange.toFixed(1)} {metric.unit}
        </span>
      </div>
    </div>
  )
}

/**
 * Summary stat card showing latest value and change from previous scan
 */
function SummaryCard({ scans, metric }: { scans: ScanData[]; metric: MetricConfig }) {
  const dataPoints = scans
    .map(s => ({ value: s[metric.key] as number | null }))
    .filter(d => d.value != null && d.value > 0) as { value: number }[]

  if (dataPoints.length === 0) return null

  const latest = dataPoints[dataPoints.length - 1].value
  const previous = dataPoints.length >= 2 ? dataPoints[dataPoints.length - 2].value : null
  const change = previous != null ? latest - previous : null
  const isImproved = change != null && (metric.lowerIsBetter ? change < 0 : change > 0)
  const changeColor = change == null || Math.abs(change) < 0.05 ? '#6b7280' : isImproved ? '#22c55e' : '#ef4444'
  const arrow = change != null ? (change > 0 ? '▲' : change < 0 ? '▼' : '●') : ''

  return (
    <div style={{
      background: metric.colorLight,
      border: `1px solid ${metric.color}22`,
      borderRadius: '10px',
      padding: '14px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
        {metric.shortLabel}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: metric.color, fontFamily: 'monospace' }}>
        {latest.toFixed(1)}
      </div>
      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{metric.unit}</div>
      {change != null && (
        <div style={{ fontSize: '11px', color: changeColor, marginTop: '4px', fontFamily: 'monospace' }}>
          {arrow} {Math.abs(change).toFixed(1)}
        </div>
      )}
    </div>
  )
}

export default function InBodyProgressCharts({ scans, compact = false }: InBodyProgressChartsProps) {
  const [showAll, setShowAll] = useState(false)

  // Sort scans chronologically (oldest first)
  const sortedScans = useMemo(() => {
    return [...scans].sort((a, b) => a.scan_date.localeCompare(b.scan_date))
  }, [scans])

  if (sortedScans.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No InBody scans yet</p>
        <p style={{ color: '#4b5563', fontSize: '12px', marginTop: '4px' }}>Add your first scan to start tracking body composition trends</p>
      </div>
    )
  }

  // Primary metrics always shown
  const primaryMetrics = METRICS.slice(0, 4) // weight, LBM, fat mass, BF%
  // Additional metric
  const secondaryMetrics = METRICS.slice(4) // SMM

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: compact ? '15px' : '18px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            Body Composition Trends
          </h3>
          <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
            {sortedScans.length} scan{sortedScans.length !== 1 ? 's' : ''} · {formatDateFull(sortedScans[0].scan_date)} — {formatDateFull(sortedScans[sortedScans.length - 1].scan_date)}
          </p>
        </div>
      </div>

      {/* Summary cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compact ? 4 : 5}, 1fr)`, gap: '8px', marginBottom: '16px' }}>
        {(compact ? primaryMetrics : METRICS).map(m => (
          <SummaryCard key={m.key} scans={sortedScans} metric={m} />
        ))}
      </div>

      {/* Trend charts */}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr', gap: '12px' }}>
        {primaryMetrics.map(m => (
          <TrendChart key={m.key} scans={sortedScans} metric={m} compact={compact} />
        ))}
      </div>

      {/* Show more toggle for secondary metrics */}
      {!compact && secondaryMetrics.length > 0 && (
        <>
          {showAll && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              {secondaryMetrics.map(m => (
                <TrendChart key={m.key} scans={sortedScans} metric={m} />
              ))}
            </div>
          )}
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              display: 'block',
              margin: '12px auto 0',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#9ca3af',
              fontSize: '12px',
              padding: '6px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
            }}
          >
            {showAll ? 'Show less' : 'Show more metrics'}
          </button>
        </>
      )}
    </div>
  )
}
