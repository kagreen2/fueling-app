 import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Use localStorage for session storage so PWA homescreen installs
        // maintain login state (cookies are not shared between browser and
        // standalone PWA contexts on iOS/Android)
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'fuel-different-auth',
        flowType: 'pkce',
      },
    }
  )
}
