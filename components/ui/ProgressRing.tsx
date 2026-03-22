'use client'

import React from 'react'

interface ProgressRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  value?: string | number
  unit?: string
}

export function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#9333EA',
  label,
  value,
  unit,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#334155"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {value !== undefined && (
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {value}
                {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {label && (
        <p className="text-sm text-slate-400 font-medium">{label}</p>
      )}
    </div>
  )
}
