'use client'

import React from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={clsx(
            'w-full bg-slate-700 border border-slate-600 text-white',
            'rounded-lg px-4 py-3 placeholder-slate-400',
            'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-slate-400 mt-1">{helperText}</p>
      )}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export function Select({
  label,
  error,
  options,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full bg-slate-700 border border-slate-600 text-white',
          'rounded-lg px-4 py-3',
          'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'appearance-none',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function TextArea({
  label,
  error,
  className,
  ...props
}: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'w-full bg-slate-700 border border-slate-600 text-white',
          'rounded-lg px-4 py-3 placeholder-slate-400',
          'focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'resize-none',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
