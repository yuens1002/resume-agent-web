import { useCallback, useEffect, useRef, useState } from 'react'
import { getProfile, ask as askApi } from './lib/api.ts'
import { adaptProfile } from './lib/adaptProfile.ts'
import { resolveRender, deriveRender, mostRecentProjectSlugs, parseShownProjectSlugs } from './lib/intent.ts'
import { ProfileContext } from './lib/profile-context.ts'
import type { ProfileVM, Turn } from './lib/types.ts'
import { Icon } from './components/Icon.tsx'
import { Pill } from './components/ui.tsx'
import { Greeting, WORK_CHIP_TEXT } from './components/Greeting.tsx'
import { Composer } from './components/Composer.tsx'
import { Turn as TurnView } from './components/Thread.tsx'
import { ProjectDetail } from './components/cards.tsx'
import { AgentMenu } from './components/AgentMenu.tsx'

// The "[First]'s Resume" starter chip is a closed, deterministic input (the
// frontend controls its exact text) — it bypasses /query and opens the
// JD-paste UI directly, no round-trip needed. Everything else (arbitrary
// phrasing like "show me Sunny's resume" or "am I a good fit for this role")
// routes through /query as normal; the model's own judgment decides whether to
// open the tool, signaled back via action_intent (resume-agent#174) — see
// deriveRender in lib/intent.ts. This replaces the old FIT_RE free-text regex,
// which only matched a fixed list of trigger phrases.
const FIT_CHIP_RE = /^\w+'s\s+Resume$/i
const FIT_INTRO =
  "Paste a job description below — or pick a sample — and I'll score the fit honestly (weighted 50% skills · 30% experience · 20% domain). If it's a strong match, I can tailor a résumé to that exact role."

// "Show recent work" (Greeting.tsx's WORK_CHIP_TEXT) is the same kind of closed,
// deterministic input as the Resume chip above — the frontend controls its exact
// text, so there is no ambiguity to resolve. It used to route through /query like
// any free-form question, relying on the model's action_intent judgment call to
// avoid opening the fit UI. That judgment proved unreliable for this exact
// question + the "human" caller-context the frontend always sends (resume-agent
// issues #180–#190) — deriveRender's action_intent-wins-outright rule (see
// lib/intent.ts) meant a single wrong roll hijacked the whole turn into the fit
// UI. Rendering the top projects directly from the already-loaded profile is
// both more reliable (no model judgment call at all) and instant (no network
// round-trip) — see WORK_CHIP_TEXT's export comment in Greeting.tsx.
const WORK_INTRO = "Here are Sunny's most recent projects:"
const WORK_CHIP_PROJECT_COUNT = 3

// The "show more" follow-up chip this branch generates below is the exact
// same kind of closed, frontend-templated text (only the count varies) — and
// the backend's own RULE_BREADTH asks the model to phrase its own remainder
// offers identically ("What are Sunny's other N projects?"), so this also
// catches "show more" follow-ups continuing from a model-driven 'work' turn.
// Handling both deterministically avoids routing back through /query (and
// its action_intent risk) for what is always the same "show the rest of the
// list" request, regardless of how the first turn was rendered.
const WORK_MORE_RE = /^What are Sunny's other \d+ projects\?$/
const WORK_MORE_INTRO = 'And the rest:'

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

  const ask = useCallback((q: string, context?: string) => {
    const key = `${Date.now()}-${seq.current++}`
    setMenu(false)

    // The starter-chip anchor opens the match/tailor UI directly — no /query round-trip.
    if (FIT_CHIP_RE.test(q)) {
      setTurns((prev) => [
        ...prev,
        { key, q, answer: FIT_INTRO, confidence: 'high', sources: [], projectSlugs: [], followups: [], render: 'fit', pending: false },
      ])
      return
    }

    // The "Show recent work" starter chip is equally deterministic — render
    // straight from the already-loaded profile, no /query round-trip and no
    // dependence on the model's action_intent judgment (see the comment above
    // WORK_INTRO for why that judgment isn't trustworthy for this exact case).
    if (q === WORK_CHIP_TEXT && profile) {
      const topSlugs = mostRecentProjectSlugs(profile.projects, WORK_CHIP_PROJECT_COUNT)
      const remaining = profile.projects.length - topSlugs.length
      setTurns((prev) => [
        ...prev,
        {
          key,
          q,
          answer: WORK_INTRO,
          confidence: 'high',
          sources: [],
          projectSlugs: topSlugs,
          followups: remaining > 0 ? [`What are Sunny's other ${remaining} projects?`] : [],
          render: 'work',
          pending: false,
        },
      ])
      return
    }

    // "Show more" follow-up chips continuing a project listing — same
    // deterministic treatment, using the shown_projects context the app
    // already generates for this exact follow-up (see FollowupChips in
    // components/ui.tsx). See the comment above WORK_MORE_RE.
    if (WORK_MORE_RE.test(q) && profile) {
      const shown = new Set(parseShownProjectSlugs(context))
      const remainingProjects = profile.projects.filter((p) => !shown.has(p.slug))
      const nextSlugs = mostRecentProjectSlugs(remainingProjects, WORK_CHIP_PROJECT_COUNT)
      const stillRemaining = remainingProjects.length - nextSlugs.length
      setTurns((prev) => [
        ...prev,
        {
          key,
          q,
          answer: WORK_MORE_INTRO,
          confidence: 'high',
          sources: [],
          projectSlugs: nextSlugs,
          followups: stillRemaining > 0 ? [`What are Sunny's other ${stillRemaining} projects?`] : [],
          render: 'work',
          pending: false,
        },
      ])
      return
    }

    setTurns((prev) => [
      ...prev,
      { key, q, answer: '', confidence: 'high', sources: [], projectSlugs: [], followups: [], render: resolveRender(q), pending: true },
    ])
    askApi(q, context)
      .then((r) => {
        // action_intent === open_match_tool: open the fit UI with the same intro
        // shown by the starter-chip shortcut, rather than the model's throwaway
        // "opening the tool" filler answer — keeps both entry points consistent.
        const isFitIntent = r.action_intent?.tool === 'open_match_tool'
        setTurns((prev) =>
          prev.map((t) =>
            t.key === key
              ? {
                  ...t,
                  answer: isFitIntent ? FIT_INTRO : r.answer,
                  confidence: isFitIntent ? 'high' : r.confidence,
                  sources: isFitIntent ? [] : r.sources ?? [],
                  projectSlugs: isFitIntent ? [] : r.project_slugs ?? [],
                  render: deriveRender(t.render, r.project_slugs, r.action_intent),
                  followups: isFitIntent
                    ? []
                    : (() => {
                        const asked = new Set(prev.map(turn => turn.q.toLowerCase().trim()))
                        return (r.follow_up_suggestions ?? []).filter(
                          f => typeof f === 'string' && !asked.has(f.toLowerCase().trim())
                        )
                      })(),
                  pending: false,
                }
              : t,
          ),
        )
      })
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
  }, [profile])

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
          <div id="scroll-top" style={{ height: 0 }} />
          <Greeting onAsk={ask} />
          {turns.map((turn) => (
            <TurnView key={turn.key} turn={turn} onAsk={ask} onOpen={setDetail} />
          ))}
          <div id="scroll-bottom" style={{ height: 0 }} />
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
