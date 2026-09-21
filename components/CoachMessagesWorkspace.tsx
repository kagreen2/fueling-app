'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Conversation = {
  athlete_id: string
  athlete_name: string
  last_message: string
  last_message_time: string
  unread_count: number
  total_count: number
}

type Athlete = {
  id: string
  teamName: string
  userType: string | null
  trainingStyle: string | null
  sport: string | null
  position: string | null
}

type ScheduledMessage = {
  id: string
  message: string
  status: 'scheduled' | 'paused' | 'completed' | 'canceled'
  recurrence: 'once' | 'weekly'
  next_send_at: string
  scheduled_for: string
  audience_label: string | null
  recipients: Array<{ athlete_id: string; recipient_name: string | null }>
}

function formatContext(athlete: Athlete) {
  if (athlete.userType === 'member') return athlete.trainingStyle || 'General Fitness'
  return `${athlete.sport || 'Athlete'}${athlete.position ? ` · ${athlete.position}` : ''}`
}

function relativeTime(value: string) {
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

export default function CoachMessagesWorkspace({
  conversations,
  unreadCount,
  athletes,
  scheduledMessages,
  selectedTeam,
}: {
  conversations: Conversation[]
  unreadCount: number
  athletes: Athlete[]
  scheduledMessages: ScheduledMessage[]
  selectedTeam: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'inbox' | 'scheduled'>('inbox')
  const [filter, setFilter] = useState<'active' | 'archived'>('active')
  const [archived, setArchived] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      return new Set(JSON.parse(localStorage.getItem('coach_archived_conversations') || '[]'))
    } catch {
      return new Set()
    }
  })

  const visibleConversations = useMemo(
    () => conversations.filter(conversation => filter === 'archived'
      ? archived.has(conversation.athlete_id)
      : !archived.has(conversation.athlete_id)),
    [archived, conversations, filter]
  )

  function toggleArchive(athleteId: string) {
    setArchived(current => {
      const next = new Set(current)
      if (next.has(athleteId)) next.delete(athleteId)
      else next.add(athleteId)
      try { localStorage.setItem('coach_archived_conversations', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const scheduledActiveCount = scheduledMessages.filter(message => message.status === 'scheduled' || message.status === 'paused').length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg">Messages</h3>
          <p className="text-slate-500 text-xs mt-1">One conversation per athlete. Archive threads you no longer need in the active inbox.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/coach/scheduled-messages')} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700">+ Schedule message</button>
          {unreadCount > 0 && <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full font-medium">{unreadCount} unread</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">
        <button onClick={() => setTab('inbox')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'inbox' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Inbox</button>
        <button onClick={() => setTab('scheduled')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'scheduled' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Scheduled {scheduledActiveCount ? `(${scheduledActiveCount})` : ''}</button>
      </div>

      {tab === 'inbox' ? (
        <>
          <div className="flex items-center gap-2">
            <button onClick={() => setFilter('active')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === 'active' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>Active ({conversations.filter(c => !archived.has(c.athlete_id)).length})</button>
            <button onClick={() => setFilter('archived')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === 'archived' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>Archived ({conversations.filter(c => archived.has(c.athlete_id)).length})</button>
          </div>

          {visibleConversations.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
              <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3"><span className="text-xl">💬</span></div>
              <h3 className="text-white font-semibold mb-1">{filter === 'archived' ? 'No archived conversations' : 'Inbox is clear'}</h3>
              <p className="text-slate-400 text-sm">{filter === 'archived' ? 'Archived threads stay available here without cluttering your active inbox.' : 'New athlete messages will appear here, grouped into one row per athlete.'}</p>
            </div>
          ) : visibleConversations.map(conversation => {
            const athlete = athletes.find(item => item.id === conversation.athlete_id)
            const unread = conversation.unread_count > 0
            const isArchived = archived.has(conversation.athlete_id)
            return (
              <div key={conversation.athlete_id} className={`border rounded-xl p-4 transition-all ${unread ? 'bg-purple-500/5 border-purple-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${unread ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>{conversation.athlete_name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><p className={`font-medium ${unread ? 'text-white' : 'text-slate-300'}`}>{conversation.athlete_name}</p>{unread && <span className="bg-red-500/20 text-red-400 text-[10px] font-semibold px-1.5 py-0.5 rounded">{conversation.unread_count} new</span>}</div>
                      <span className="text-slate-500 text-xs">{relativeTime(conversation.last_message_time)}</span>
                    </div>
                    {athlete && <p className="text-slate-500 text-xs mb-1.5">{athlete.teamName} · {formatContext(athlete)}</p>}
                    <p className={`text-sm truncate ${unread ? 'text-slate-200' : 'text-slate-400'}`}>{conversation.last_message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => router.push(`/coach/athlete/${conversation.athlete_id}?from_team=${selectedTeam}&from_view=messages`)} className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700">Open conversation</button>
                      <button onClick={() => toggleArchive(conversation.athlete_id)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-400 hover:text-white">{isArchived ? 'Restore to inbox' : 'Archive'}</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      ) : (
        <div className="space-y-3">
          {scheduledMessages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/35 px-6 py-10 text-center"><p className="text-white font-semibold">Nothing scheduled yet</p><p className="mt-1 text-sm text-slate-400">Create a one-time or weekly message without leaving the inbox.</p><button onClick={() => router.push('/coach/scheduled-messages')} className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">Schedule your first message</button></div>
          ) : scheduledMessages.filter(message => message.status !== 'canceled').slice(0, 8).map(message => {
            const active = message.status === 'scheduled' || message.status === 'paused'
            const when = active ? message.next_send_at : message.scheduled_for
            const recipientLabel = message.audience_label || `${message.recipients.length} athlete${message.recipients.length === 1 ? '' : 's'}`
            return <div key={message.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${message.status === 'scheduled' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : message.status === 'paused' ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-slate-600 bg-slate-700 text-slate-300'}`}>{message.status}</span><span className="text-[11px] text-slate-500">{message.recurrence === 'weekly' ? 'Weekly' : 'One-time'} · {recipientLabel}</span></div><p className="mt-2 truncate text-sm text-slate-100">{message.message}</p><p className="mt-1 text-xs text-slate-500">{active ? 'Next send' : 'Last sent'}: {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(when))}</p></div><button onClick={() => router.push('/coach/scheduled-messages')} className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-purple-400 hover:text-white">Manage</button></div></div>
          })}
          {scheduledMessages.filter(message => message.status !== 'canceled').length > 8 && <button onClick={() => router.push('/coach/scheduled-messages')} className="w-full rounded-lg border border-slate-700 py-2 text-xs font-semibold text-slate-400 hover:text-white">View all scheduled messages</button>}
        </div>
      )}
    </div>
  )
}
