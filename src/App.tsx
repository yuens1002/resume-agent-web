import { useCallback, useEffect, useRef, useState } from 'react'
import { getProfile, ask as askApi } from './lib/api.ts'
import { adaptProfile } from './lib/adaptProfile.ts'
import { resolveRender } from './lib/intent.ts'
import { ProfileContext } from './lib/profile-context.ts'
import type { ProfileVM, Turn } from './lib/types.ts'
import { Icon } from './components/Icon.tsx'
import { Pill } from './components/ui.tsx'
import { Greeting } from './components/Greeting.tsx'
import { Composer } from './components/Composer.tsx'
import { Turn as TurnView } from './components/Thread.tsx'
import { ProjectDetail } from './components/cards.tsx'
import { AgentMenu } from './components/AgentMenu.tsx'

// Phrases that mean "open the match/tailor tool" rather than "answer a question".
// These bypass /query and render the JD-paste UI directly (no confused LLM reply).
const FIT_RE =
  /\b(match\s+(a\s+)?job|tailor\s+(my|a)\s+(r[eé]sum[eé]?|cv)|score\s+(the\s+)?fit|score\s+a\s+job|paste\s+(a|the|my)\s+(job|jd)|job\s+description|check\s+(my\s+)?fit|am\s+i\s+a\s+(good\s+)?fit)\b/i
const FIT_INTRO =
  "Paste a job description below — or pick a sample — and I'll score the fit honestly (weighted 50% skills · 30% experience · 20% domain). If it's a strong match, I can tailor a résumé to that exact role."

export function App() {
  const [profile, setProfile] = useState<ProfileVM | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [detail, setDetail] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const seq = useRef(0)

  // Load the live profile once.
  useEffect(() => {
    let alive = true
    getProfile()
      .then((raw) => alive && setProfile(adaptProfile(raw)))
      .catch(() => alive && setLoadErr(true))
    return () => {
      alive = false
    }
  }, [])

  // Auto-scroll to the newest turn (never scrollIntoView).
  useEffect(() => {
    if (turns.length === 0) return
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
  }, [turns.length])

  // Esc closes any open overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetail(null)
        setMenu(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Lock background scroll while an overlay is open (prevents the double scrollbar
  // where the panel and the page both scroll).
  useEffect(() => {
    const open = menu || detail !== null
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menu, detail])

  const ask = useCallback((q: string) => {
    const key = `${Date.now()}-${seq.current++}`
    setMenu(false)

    // Tool-trigger phrases open the match/tailor UI directly — no /query round-trip.
    if (FIT_RE.test(q)) {
      setTurns((prev) => [
        ...prev,
        { key, q, answer: FIT_INTRO, confidence: 'high', sources: [], followups: [], render: 'fit', pending: false },
      ])
      return
    }

    setTurns((prev) => [
      ...prev,
      { key, q, answer: '', confidence: 'high', sources: [], followups: [], render: resolveRender(q), pending: true },
    ])
    askApi(q)
      .then((r) =>
        setTurns((prev) =>
          prev.map((t) =>
            t.key === key
              ? {
                  ...t,
                  answer: r.answer,
                  confidence: r.confidence,
                  sources: r.sources ?? [],
                  followups: r.follow_up_suggestions ?? [],
                  pending: false,
                }
              : t,
          ),
        ),
      )
      .catch(() =>
        setTurns((prev) =>
          prev.map((t) =>
            t.key === key
              ? {
                  ...t,
                  answer:
                    "I couldn't reach my agent just now — please try again in a moment, or grab time via the ⌘ menu top-right.",
                  confidence: 'low',
                  pending: false,
                  error: true,
                }
              : t,
          ),
        ),
      )
  }, [])

  if (loadErr) {
    return (
      <div className="app">
        <div style={{ margin: 'auto', padding: 40, textAlign: 'center', fontFamily: 'var(--serif)', color: 'var(--ink-2)' }}>
          <p style={{ fontSize: 20 }}>This résumé is briefly offline.</p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>
            Couldn't reach the agent. Please refresh in a moment.
          </p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="app">
        <div style={{ margin: 'auto', padding: 40 }}>
          <div className="thinking" aria-label="Loading">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      </div>
    )
  }

  const { contact, availability } = profile

  return (
    <ProfileContext.Provider value={profile}>
      <div className="app">
        <header className="hdr">
          <div className="hdr-id">
            <span className="hdr-name">{contact.name}</span>
            <span className="hdr-role">{contact.role}</span>
          </div>
          <div className="hdr-spacer" />
          {availability.show && <Pill label={availability.label} />}
          <button
            className="iconbtn"
            onClick={() => setMenu((m) => !m)}
            aria-label="Agent & links menu"
            title="Talk to my agent / for machines"
          >
            <Icon name="dots" />
          </button>
        </header>

        <main className="thread">
          <Greeting onAsk={ask} />
          {turns.map((turn) => (
            <TurnView key={turn.key} turn={turn} onAsk={ask} onOpen={setDetail} />
          ))}
        </main>

        <Composer onAsk={ask} showHints={turns.length === 0} />

        <footer className="foot">
          <span>© {contact.name}</span>
          <span className="sep">·</span>
          {contact.github && (
            <>
              <a href={contact.github} target="_blank" rel="noreferrer">
                {contact.github.replace(/^https?:\/\//, '')}
              </a>
              <span className="sep">·</span>
            </>
          )}
          {contact.linkedin && (
            <>
              <a href={contact.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <span className="sep">·</span>
            </>
          )}
          <button className="footlink" onClick={() => setMenu(true)}>
            ⌘ for machines
          </button>
        </footer>

        {menu && <AgentMenu onClose={() => setMenu(false)} />}
        {detail && <ProjectDetail slug={detail} onClose={() => setDetail(null)} />}
      </div>
    </ProfileContext.Provider>
  )
}
