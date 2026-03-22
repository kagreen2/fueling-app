'use client'

import React from 'react'
import { Card, CardContent } from './Card'

interface StatCardProps {
  icon?: React.ReactNode
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'orange'
  size?: 'sm' | 'md' | 'lg'
}

export function StatCard({
  icon,
  label,
  value,
  unit,
  trend,
  trendValue,
  color = 'green',
  size = 'md',
}: StatCardProps) {
  const colorStyles = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    orange: 'text-orange-400',
  }

  const trendStyles = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  }

  const sizeStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <Card className={sizeStyles[size]}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${colorStyles[color]}`}>
              {value}
            </span>
            {unit && (
              <span className="text-sm text-slate-400">{unit}</span>
            )}
          </div>
          {trend && trendValue && (
            <p className={`text-xs mt-2 font-medium ${trendStyles[trend]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-2xl ml-2">{icon}</div>
        )}
      </div>
    </Card>
  )
}
