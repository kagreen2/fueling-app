import { NextResponse } from 'next/server'
import { getResourceArticles, toResourceMetadata } from '@/lib/resources/catalog'
import { getAuthenticatedContext } from '@/lib/resources/access'

export async function GET() {
  const context = await getAuthenticatedContext()
  if (!context) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  return NextResponse.json({ articles: getResourceArticles().map(toResourceMetadata) })
}
