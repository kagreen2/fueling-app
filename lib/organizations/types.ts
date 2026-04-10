/**
 * Organization — represents a white-label tenant (school, gym, company).
 * Maps to the `organizations` table in Supabase.
 */
export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  icon_url: string | null
  primary_color: string
  accent_color: string
  background_color: string
  contact_email: string | null
  sport: string | null
  website: string | null
  custom_email_from: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Default branding values — used when no organization is found
 * (e.g., on the main fueldifferent.com domain).
 */
export const DEFAULT_ORG: Organization = {
  id: '',
  name: 'Fuel Different',
  slug: 'default',
  logo_url: null,
  icon_url: null,
  primary_color: '#9333EA',
  accent_color: '#22C55E',
  background_color: '#0F172A',
  contact_email: 'kelly@crossfitironflag.com',
  sport: null,
  website: 'https://fueldifferent.com',
  custom_email_from: 'Fuel Different',
  is_active: true,
  created_at: '',
  updated_at: '',
}

/**
 * Extracts the subdomain slug from a hostname.
 * 
 * Examples:
 *   "lincolnhigh.fueldifferent.com" → "lincolnhigh"
 *   "fueldifferent.com"             → null (no subdomain)
 *   "localhost:3000"                → null
 *   "www.fueldifferent.com"         → null (www is ignored)
 *   "lincolnhigh.localhost"         → "lincolnhigh" (dev mode)
 */
export function extractSubdomain(hostname: string): string | null {
  // Remove port
  const host = hostname.split(':')[0]

  // Dev mode: handle *.localhost
  if (host.endsWith('.localhost') && host !== 'localhost') {
    const sub = host.replace('.localhost', '')
    return sub === 'www' ? null : sub
  }

  // Production: handle *.fueldifferent.com or *.fueldifferent.app
  const parts = host.split('.')
  if (parts.length >= 3) {
    const sub = parts[0]
    // Ignore www and common non-org subdomains
    if (sub === 'www' || sub === 'api' || sub === 'app') return null
    return sub
  }

  return null
}

/**
 * Generates CSS custom properties from an organization's branding.
 * These are applied to the <html> element to theme the entire app.
 */
export function orgToCssVars(org: Organization): Record<string, string> {
  return {
    '--org-primary': org.primary_color,
    '--org-accent': org.accent_color,
    '--org-bg': org.background_color,
    '--org-name': org.name,
  }
}

/**
 * Converts a hex color to Tailwind-compatible RGB values.
 * "#9333EA" → "147 51 234"
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '147 51 234' // fallback to purple
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}
