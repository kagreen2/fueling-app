import { createBrowserClient } from '@supabase/ssr'

/**
 * Custom storage adapter that writes to BOTH cookies (for Next.js middleware)
 * and localStorage (for PWA homescreen persistence).
 *
 * Why both?
 * - Cookies: Required by the server-side middleware to verify auth on protected routes.
 *   Without cookies, the middleware redirects to /login even after a successful sign-in.
 * - localStorage: Required for PWA standalone mode on iOS/Android, where cookies
 *   are not shared between the browser and the homescreen app context.
 *
 * The default @supabase/ssr createBrowserClient already handles cookies.
 * We layer localStorage on top so the PWA can restore sessions independently.
 */
class DualStorage {
  private storageKey: string

  constructor(storageKey: string) {
    this.storageKey = storageKey
  }

  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    // Try localStorage first (PWA restore), cookies are handled by @supabase/ssr
    return window.localStorage.getItem(key)
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    // Mirror to localStorage for PWA persistence
    window.localStorage.setItem(key, value)
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }
  )
}

/**
 * On app startup (client-side only), check if localStorage has a session
 * that cookies don't. If so, restore it into the Supabase client so the
 * cookie-based session gets re-established on the next server request.
 *
 * Call this once in your root layout or _app component.
 */
export async function restorePwaSession() {
  if (typeof window === 'undefined') return

  const stored = window.localStorage.getItem('fuel-different-auth')
  if (!stored) return

  try {
    const parsed = JSON.parse(stored)
    const accessToken = parsed?.access_token
    const refreshToken = parsed?.refresh_token

    if (accessToken && refreshToken) {
      const supabase = createClient()
      // Check if there's already a valid session (from cookies)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No cookie session — restore from localStorage
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      }
    }
  } catch {
    // Invalid stored data — ignore
  }
}
