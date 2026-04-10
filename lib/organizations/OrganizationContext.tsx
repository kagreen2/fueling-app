'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Organization, DEFAULT_ORG, extractSubdomain, hexToRgb } from './types'

interface OrganizationContextValue {
  org: Organization
  loading: boolean
  /** Refresh org data from the database */
  refresh: () => Promise<void>
  /** Whether the current org is the default (Fuel Different) */
  isDefault: boolean
}

const OrganizationContext = createContext<OrganizationContextValue>({
  org: DEFAULT_ORG,
  loading: true,
  refresh: async () => {},
  isDefault: true,
})

export function useOrganization() {
  return useContext(OrganizationContext)
}

/**
 * Applies CSS custom properties to the document root for theming.
 * This allows Tailwind classes to reference org colors via CSS variables.
 */
function applyOrgTheme(org: Organization) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.style.setProperty('--org-primary', org.primary_color)
  root.style.setProperty('--org-primary-rgb', hexToRgb(org.primary_color))
  root.style.setProperty('--org-accent', org.accent_color)
  root.style.setProperty('--org-accent-rgb', hexToRgb(org.accent_color))
  root.style.setProperty('--org-bg', org.background_color)
  root.style.setProperty('--org-bg-rgb', hexToRgb(org.background_color))
}

/**
 * OrganizationProvider — wraps the app and provides org branding.
 * 
 * Resolution order:
 * 1. Subdomain detection (e.g., lincolnhigh.fueldifferent.com → slug "lincolnhigh")
 * 2. User's profile org_id (after login, looks up the user's assigned org)
 * 3. Falls back to DEFAULT_ORG (Fuel Different branding)
 * 
 * The resolved org is cached in localStorage for instant loading on return visits.
 */
export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<Organization>(DEFAULT_ORG)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const CACHE_KEY = 'fuel-org-cache'

  const fetchOrgBySlug = useCallback(async (slug: string): Promise<Organization | null> => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    return data as Organization | null
  }, [supabase])

  const fetchOrgById = useCallback(async (orgId: string): Promise<Organization | null> => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .eq('is_active', true)
      .single()
    return data as Organization | null
  }, [supabase])

  const resolveOrg = useCallback(async () => {
    try {
      // 1. Try subdomain first
      if (typeof window !== 'undefined') {
        const slug = extractSubdomain(window.location.hostname)
        if (slug) {
          const orgData = await fetchOrgBySlug(slug)
          if (orgData) {
            setOrg(orgData)
            applyOrgTheme(orgData)
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(orgData)) } catch {}
            setLoading(false)
            return
          }
        }
      }

      // 2. Try user's profile org_id (if logged in)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .single()

        if (profile?.org_id) {
          const orgData = await fetchOrgById(profile.org_id)
          if (orgData) {
            setOrg(orgData)
            applyOrgTheme(orgData)
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(orgData)) } catch {}
            setLoading(false)
            return
          }
        }

        // 3. Try user's team's org_id
        // First check team_members
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('athlete_id', user.id)
          .limit(1)
          .maybeSingle()

        if (teamMember?.team_id) {
          const { data: team } = await supabase
            .from('teams')
            .select('org_id')
            .eq('id', teamMember.team_id)
            .single()

          if (team?.org_id) {
            const orgData = await fetchOrgById(team.org_id)
            if (orgData) {
              setOrg(orgData)
              applyOrgTheme(orgData)
              try { localStorage.setItem(CACHE_KEY, JSON.stringify(orgData)) } catch {}
              setLoading(false)
              return
            }
          }
        }
      }

      // 4. Fallback to default
      applyOrgTheme(DEFAULT_ORG)
      setLoading(false)
    } catch (err) {
      console.error('Failed to resolve organization:', err)
      applyOrgTheme(DEFAULT_ORG)
      setLoading(false)
    }
  }, [supabase, fetchOrgBySlug, fetchOrgById])

  useEffect(() => {
    // Load cached org immediately for instant theming
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const cachedOrg = JSON.parse(cached) as Organization
        setOrg(cachedOrg)
        applyOrgTheme(cachedOrg)
      }
    } catch {}

    // Then resolve the actual org (may update if cache is stale)
    resolveOrg()
  }, [resolveOrg])

  const refresh = useCallback(async () => {
    setLoading(true)
    await resolveOrg()
  }, [resolveOrg])

  const isDefault = org.slug === 'default' || org.id === ''

  return (
    <OrganizationContext.Provider value={{ org, loading, refresh, isDefault }}>
      {children}
    </OrganizationContext.Provider>
  )
}
