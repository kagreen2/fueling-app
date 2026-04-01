import { createBrowserClient } from '@supabase/ssr'

const STORAGE_KEY = 'fuel-different-auth'

/**
 * Custom storage adapter that mirrors Supabase session data to localStorage.
 * 
 * Why localStorage?
 * - PWA standalone mode on iOS does NOT share cookies with the browser.
 *   When the user opens the app from their home screen, cookies are gone.
 * - localStorage persists across PWA sessions on iOS/Android.
 * - The default @supabase/ssr createBrowserClient uses cookies for SSR middleware,
 *   but we layer localStorage on top so the PWA can restore sessions.
 */
class DualStorage {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key)
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  }
}

const dualStorage = new DualStorage()

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
        storage: dualStorage,
      },
    }
  )
}

/**
 * On app startup (client-side only), check if localStorage has a session
 * that the Supabase client can't find via cookies. If so, restore it.
 * 
 * This handles the PWA cold-start scenario where cookies are cleared
 * but localStorage still has the session tokens.
 * 
 * Call this once in your root layout or a top-level client component.
 */
export async function restorePwaSession() {
  if (typeof window === 'undefined') return

  // Check if we're in standalone/PWA mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true
  
  if (!isStandalone) return // Only needed for PWA

  const supabase = createClient()
  
  // Check if there's already a valid session
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return // Already authenticated, nothing to do

  // Try to find session tokens in localStorage (Supabase stores them with a specific key pattern)
  // Also check our manual backup key
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return

  try {
    const parsed = JSON.parse(stored)
    const accessToken = parsed?.access_token
    const refreshToken = parsed?.refresh_token

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    }
  } catch {
    // Invalid stored data — clear it
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
