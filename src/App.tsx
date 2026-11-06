import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Hash, MessageCircle, Send, Sparkles, Users, X } from 'lucide-react'
import { getMember, members, type MemberName } from './lib/members'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Message } from './types'

const SESSION_KEY = 'group-hub-member'
const MAX_LENGTH = 2000

function App() {
  const [currentUser, setCurrentUser] = useState<MemberName | null>(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    return members.some((member) => member.name === saved) ? (saved as MemberName) : null
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [showLatest, setShowLatest] = useState(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const shouldStickToBottom = useRef(true)

  useEffect(() => {
    const db = supabase
    if (!currentUser || !db) return
    let active = true
    setLoading(true)
    setError('')

    void db
      .from('messages')
      .select('id, sender_name, content, created_at')
      .order('created_at', { ascending: true })
      .limit(500)
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) setError(`Couldn't load the conversation. ${fetchError.message}`)
        else setMessages((data ?? []) as Message[])
        setLoading(false)
      })

    const channel = db
      .channel('group-hub-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new as Message
        setMessages((current) => current.some((message) => message.id === newMessage.id)
          ? current
          : [...current, newMessage].sort((a, b) => a.created_at.localeCompare(b.created_at)))
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Live updates disconnected. Check your connection and reload the hub.')
        }
      })

    return () => {
      active = false
      void db.removeChannel(channel)
    }
  }, [currentUser])

  useEffect(() => {
    if (shouldStickToBottom.current) {
      endRef.current?.scrollIntoView({ behavior: messages.length > 1 ? 'smooth' : 'instant' })
      setShowLatest(false)
    } else if (messages.length) {
      setShowLatest(true)
    }
  }, [messages])

  function chooseMember(name: MemberName) {
    sessionStorage.setItem(SESSION_KEY, name)
    setCurrentUser(name)
  }

  function switchMember() {
    sessionStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
    setMessages([])
    setDraft('')
  }

  function onScroll() {
    const element = messageListRef.current
    if (!element) return
    const gap = element.scrollHeight - element.scrollTop - element.clientHeight
    shouldStickToBottom.current = gap < 120
    if (gap < 120) setShowLatest(false)
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault()
    const content = draft.trim()
    if (!content || !currentUser || !supabase || sending) return
    setSending(true)
    setError('')
    shouldStickToBottom.current = true
    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({ sender_name: currentUser, content })
      .select('id, sender_name, content, created_at')
      .single()

    if (sendError) {
      setError(`Your message wasn't sent. ${sendError.message}`)
    } else if (data) {
      const sentMessage = data as Message
      setMessages((current) => current.some((message) => message.id === sentMessage.id)
        ? current
        : [...current, sentMessage].sort((a, b) => a.created_at.localeCompare(b.created_at)))
      setDraft('')
    }
    setSending(false)
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  if (!currentUser) {
    return <WelcomeScreen onChoose={chooseMember} />
  }

  const activeMember = getMember(currentUser)

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={17} strokeWidth={2.1} /></div>
          <span>the group<span className="brand-light"> hub</span></span>
          <span className="beta-pill public-pill">PUBLIC</span>
        </div>

        <div className="workspace-label">YOUR SPACE <ChevronDown size={13} /></div>
        <button className="room-item active-room"><span className="room-hash"><Hash size={17} /></span><span>the-lounge</span><span className="room-status" /></button>
        <div className="sidebar-section-title"><span>YOUR PEOPLE</span><button aria-label="View all members" className="tiny-icon"><Users size={14} /></button></div>
        <div className="people-list">
          {members.map((member) => (
            <div className="person-row" key={member.name}>
              <span className="avatar avatar-small" style={{ '--member-color': member.color, '--member-tint': member.tint } as React.CSSProperties}>{member.initials}</span>
              <span className="person-name">{member.name}</span>
              <span className={`online-dot ${member.name === currentUser ? 'is-online' : ''}`} />
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="note-icon"><Sparkles size={14} /></span><span>A little corner<br />of the internet to share.</span></div>
          <div className="profile-switcher">
            <span className="avatar avatar-small" style={{ '--member-color': activeMember.color, '--member-tint': activeMember.tint } as React.CSSProperties}>{activeMember.initials}</span>
            <div className="profile-copy"><strong>{currentUser}</strong><span>Here with the group</span></div>
            <button className="tiny-icon profile-menu" title="Switch member" onClick={switchMember}><ChevronDown size={15} /></button>
          </div>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>your space</span><span className="crumb-slash">/</span><strong><Hash size={15} /> the-lounge</strong></div>
          <div className="topbar-actions"><div className="online-people"><span className="online-stack">{members.map((member) => <span key={member.name} style={{ '--member-color': member.color, '--member-tint': member.tint } as React.CSSProperties}>{member.initials}</span>)}</span><span>4 profiles</span></div><span className="topbar-divider" /><button className="help-button" onClick={() => setNoticeOpen(!noticeOpen)} aria-label="About this space"><CircleHelp size={18} /></button></div>
        </header>

        <div className="channel-intro">
          <div className="intro-icon"><Hash size={25} /></div>
          <div className="intro-copy"><div className="eyebrow">A GOOD PLACE TO START</div><h1>the-lounge</h1><p>For the plans, the laughs, and everything in between.</p></div>
          <div className="intro-date"><Clock3 size={13} /> public-link chat</div>
        </div>

        {noticeOpen && <div className="access-notice"><div><strong>Quick heads-up</strong><p>This is a public-link space. The member picker is just a name label, not a sign-in. Anyone with this site link can view and post in the chat.</p></div><button className="tiny-icon" onClick={() => setNoticeOpen(false)} aria-label="Dismiss"><X size={16} /></button></div>}

        <div className="message-list" ref={messageListRef} onScroll={onScroll}>
          <div className="history-marker"><span /> THIS IS THE START OF SOMETHING <span /></div>
          <div className="welcome-message"><div className="welcome-emoji">✳</div><h2>Welcome to the lounge</h2><p>This is where the group gets together. Drop a hello, share a thought, or make a plan.</p><div className="welcome-tags"><span><Users size={13} /> four familiar names</span><span><MessageCircle size={13} /> say what’s up</span></div></div>
          {loading && <div className="loading-state"><span className="spinner" /> Gathering the conversation…</div>}
          {!loading && messages.length > 0 && <div className="date-divider"><span>THE CONVERSATION</span></div>}
          {!loading && messages.map((message, index) => {
            const member = getMember(message.sender_name)
            const previous = messages[index - 1]
            const grouped = previous?.sender_name === message.sender_name && new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 5 * 60 * 1000
            return (
              <article className={`message-row ${grouped ? 'message-grouped' : ''}`} key={message.id}>
                {!grouped ? <span className="avatar message-avatar" style={{ '--member-color': member.color, '--member-tint': member.tint } as React.CSSProperties}>{member.initials}</span> : <span className="avatar-spacer" />}
                <div className="message-body">
                  <div className={`message-meta ${grouped ? 'message-meta-grouped' : ''}`}><strong style={{ color: member.color }}>{message.sender_name}</strong><time dateTime={message.created_at}>{formatTime(message.created_at)}</time></div>
                  <p>{message.content}</p>
                </div>
              </article>
            )
          })}
          {!isSupabaseConfigured && <div className="error-banner" role="alert"><span>Connect the Supabase URL and publishable key in your local environment to load and send messages.</span></div>}
          {error && <div className="error-banner" role="alert"><span>{error}</span><button className="tiny-icon" onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
          <div ref={endRef} />
        </div>

        {showLatest && <button className="latest-button" onClick={() => { shouldStickToBottom.current = true; endRef.current?.scrollIntoView({ behavior: 'smooth' }) }}><ArrowDown size={14} /> New messages</button>}

        <form className="composer-wrap" onSubmit={sendMessage}>
          <div className="composer">
            <span className="composer-avatar" style={{ '--member-color': activeMember.color, '--member-tint': activeMember.tint } as React.CSSProperties}>{activeMember.initials}</span>
            <textarea aria-label="Write a message" placeholder={`Message as ${currentUser}…`} value={draft} maxLength={MAX_LENGTH} rows={1} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKey} />
            <div className="composer-tools"><span className="char-count">{draft.length > MAX_LENGTH - 150 ? `${draft.length}/${MAX_LENGTH}` : ''}</span><button className="send-button" type="submit" disabled={!draft.trim() || sending} aria-label="Send message">{sending ? <span className="button-spinner" /> : <Send size={16} />}</button></div>
          </div>
          <div className="composer-hint"><span><kbd>↵</kbd> to send <span className="hint-dot">·</span> <kbd>shift</kbd> + <kbd>↵</kbd> for a new line</span><span className="powered-hint"><span className="live-pulse" /> live with the group</span></div>
        </form>
        <div className="mobile-member" onClick={switchMember}><span className="avatar avatar-small" style={{ '--member-color': activeMember.color, '--member-tint': activeMember.tint } as React.CSSProperties}>{activeMember.initials}</span>{currentUser}<ArrowUpRight size={13} /></div>
      </section>
    </main>
  )
}

function WelcomeScreen({ onChoose }: { onChoose: (name: MemberName) => void }) {
  return <main className="welcome-screen"><div className="welcome-orb orb-one" /><div className="welcome-orb orb-two" /><div className="welcome-card">
    <div className="welcome-brand"><span className="brand-mark"><Sparkles size={17} /></span><span>the group<span className="brand-light"> hub</span></span></div>
    <div className="welcome-overline"><span /> YOUR PEOPLE, YOUR PLACE <span /></div>
    <h1>Who's using<br />the hub today<span className="question-dot">?</span></h1>
    <p className="welcome-subtitle">Pick your name and pull up a chair.</p>
    <div className="member-grid">
      {members.map((member, index) => <button className="member-card" key={member.name} style={{ '--member-color': member.color, '--member-tint': member.tint, '--card-delay': `${index * 75}ms` } as React.CSSProperties} onClick={() => onChoose(member.name)}>
        <span className="avatar member-avatar">{member.initials}</span><span className="member-card-copy"><strong>{member.name}</strong><span>Join the lounge</span></span><span className="member-arrow"><ArrowUpRight size={17} /></span>
      </button>)}
    </div>
    <div className="welcome-footnote"><span><Check size={12} /></span> A little space for the four of you</div>
  </div><div className="screen-footer"><span>MADE FOR YOUR CIRCLE</span><span>EST. ALWAYS</span></div></main>
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp))
}

export default App
