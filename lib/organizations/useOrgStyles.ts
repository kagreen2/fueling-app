'use client'

import { useMemo } from 'react'
import { useOrganization } from './OrganizationContext'

/**
 * useOrgStyles — returns inline style objects and class helpers
 * that use the current organization's branding colors.
 * 
 * Usage:
 *   const { primaryBg, primaryText, accentBg, accentText, primaryBorder } = useOrgStyles()
 *   <button style={primaryBg}>Click me</button>
 *   <span style={accentText}>Highlighted</span>
 */
export function useOrgStyles() {
  const { org } = useOrganization()

  return useMemo(() => ({
    // Background styles
    primaryBg: { backgroundColor: org.primary_color } as React.CSSProperties,
    primaryBgHover: { backgroundColor: org.primary_color + 'dd' } as React.CSSProperties,
    primaryBgSubtle: { backgroundColor: org.primary_color + '15' } as React.CSSProperties,
    accentBg: { backgroundColor: org.accent_color } as React.CSSProperties,
    accentBgSubtle: { backgroundColor: org.accent_color + '15' } as React.CSSProperties,

    // Text styles
    primaryText: { color: org.primary_color } as React.CSSProperties,
    accentText: { color: org.accent_color } as React.CSSProperties,

    // Border styles
    primaryBorder: { borderColor: org.primary_color } as React.CSSProperties,
    primaryBorderSubtle: { borderColor: org.primary_color + '40' } as React.CSSProperties,
    accentBorder: { borderColor: org.accent_color } as React.CSSProperties,

    // Combined styles for common patterns
    primaryButton: {
      backgroundColor: org.primary_color,
      color: '#ffffff',
    } as React.CSSProperties,
    primaryButtonHover: {
      backgroundColor: org.primary_color + 'dd',
      color: '#ffffff',
    } as React.CSSProperties,

    // Glow / blur effects
    primaryGlow: { backgroundColor: org.primary_color + '18' } as React.CSSProperties,

    // Active tab / selected state
    activeTab: {
      backgroundColor: org.primary_color,
      color: '#ffffff',
    } as React.CSSProperties,

    // Link color
    linkColor: { color: org.primary_color } as React.CSSProperties,

    // Raw colors for custom use
    colors: {
      primary: org.primary_color,
      accent: org.accent_color,
      background: org.background_color,
    },
  }), [org.primary_color, org.accent_color, org.background_color])
}
