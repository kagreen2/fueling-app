'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  athlete_id: string
  message: string
  read: boolean
  created_at: string
}

interface ChatPanelProps {
  /** The athlete record ID (used to scope the conversation) */
  athleteId: string
  /** Current user's profile ID */
  currentUserId: string
  /** The other participant's profile ID */
  otherUserId: string
  /** Display name of the other participant */
  otherUserName: string
  /** Role label for the other participant (e.g. "Coach", "Athlete", "Member") */
  otherUserRole?: string
  /** If true, renders in a compact card style */
  compact?: boolean
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } else if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
}

export default function ChatPanel({
  athleteId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserRole = 'Coach',
  compact = false,
}: ChatPanelProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(!compact)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load messages
  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
    setLoading(false)
  }, [athleteId, supabase])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Mark unread messages as read when panel is open
  useEffect(() => {
    if (!isOpen || messages.length === 0) return

    const unreadIds = messages
      .filter(m => m.receiver_id === currentUserId && !m.read)
      .map(m => m.id)

    if (unreadIds.length > 0) {
      supabase
        .from('chat_messages')
        .update({ read: true })
        .in('id', unreadIds)
        .then(() => {
          setMessages(prev =>
            prev.map(m => unreadIds.includes(m.id) ? { ...m, read: true } : m)
          )
        })
    }
  }, [isOpen, messages, currentUserId, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100)
    }
  }, [messages, isOpen, scrollToBottom])

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(loadMessages, 10000)
    return () => clearInterval(interval)
  }, [isOpen, loadMessages])

  async function handleSend() {
    const text = newMessage.trim()
    if (!text || sending) return

    setSending(true)
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: otherUserId,
        athlete_id: athleteId,
        message: text,
        read: false,
      })

    if (!error) {
      setNewMessage('')
      await loadMessages()
      inputRef.current?.focus()
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const unreadCount = messages.filter(m => m.receiver_id === currentUserId && !m.read).length

  // Compact mode: show as a collapsible card
  if (compact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '14px 18px',
          cursor: 'pointer',
          color: '#f1f5f9',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>💬</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Messages</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              {messages.length === 0 ? 'Start a conversation' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
        {unreadCount > 0 && (
          <span style={{
            background: '#7c3aed',
            color: 'white',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '20px',
            minWidth: '22px',
            textAlign: 'center',
          }}>
            {unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: compact ? '400px' : '500px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>💬</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
              {otherUserName}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>{otherUserRole}</div>
          </div>
        </div>
        {compact && (
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        minHeight: '120px',
        maxHeight: compact ? '260px' : '340px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '13px' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#4b5563' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
            <p style={{ fontSize: '13px' }}>No messages yet</p>
            <p style={{ fontSize: '11px', marginTop: '4px' }}>Send a message to start the conversation</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isMine ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                      color: isMine ? '#ffffff' : '#e2e8f0',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.message}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#4b5563',
                    marginTop: '3px',
                    paddingLeft: isMine ? '0' : '4px',
                    paddingRight: isMine ? '4px' : '0',
                  }}>
                    {formatTime(msg.created_at)}
                    {isMine && msg.read && (
                      <span style={{ marginLeft: '4px', color: '#7c3aed' }}>✓</span>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#f1f5f9',
            fontSize: '13px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            maxHeight: '80px',
            overflowY: 'auto',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          style={{
            background: newMessage.trim() ? '#7c3aed' : 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 16px',
            color: newMessage.trim() ? '#ffffff' : '#4b5563',
            fontSize: '13px',
            fontWeight: 600,
            cursor: newMessage.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
