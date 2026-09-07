import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Turn as TurnType } from '../lib/types.ts'
import { INSTANT } from '../lib/motion.ts'
import { sanitizeAnswer } from '../lib/answer.ts'
import { Avatar, SourcePills, FollowupChips } from './ui.tsx'
import { WorkResult, AboutResult } from './cards.tsx'
import { MatchResume } from './MatchResume.tsx'

/* Word-by-word typewriter reveal. Each word token (word + trailing whitespace)
   is appended on a 15ms interval so content appears immediately rather than
   fading in after a hard wait. A blinking cursor tracks the live edge; when
   the last word lands the cursor disappears and onDone fires (reveals sources
   + follow-ups). INSTANT mode skips the animation entirely. */
function AnswerBody({ text, onDone }: { text: string; onDone?: () => void }) {
  const clean = sanitizeAnswer(text)
  const words = clean.match(/\S+\s*/g) ?? [clean]
  const total = words.length
  const interval = Math.max(1, Math.min(15, Math.floor(700 / total)))
  const [count, setCount] = useState(INSTANT ? total : 0)

  useEffect(() => {
    if (INSTANT) { onDone?.(); return }
    if (count >= total) return
    const t = setTimeout(() => {
      const next = count + 1
      setCount(next)
      if (next >= total) onDone?.()
    }, interval)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, total])

  const typing = count < total

  return (
    <div className="richtext">
      {typing ? (
        <p>{words.slice(0, count).join('')}<span className="tw-cursor" aria-hidden /></p>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{clean}</ReactMarkdown>
      )}
    </div>
  )
}

function Thinking() {
  return (
    <div className="thinking" aria-label="Thinking">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  )
}

export function Turn({
  turn,
  onAsk,
  onOpen,
}: {
  turn: TurnType
  onAsk: (q: string, context?: string) => void
  onOpen: (slug: string) => void
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="turn turn-anim">
      {turn.q && (
        <div className="ask-row">
          <div className="ask-bubble">{turn.q}</div>
        </div>
      )}
      <div className="agent">
        <Avatar />
        <div className="agent-body">
          {turn.pending ? (
            <Thinking />
          ) : (
            <>
              <div className="agent-meta">
                <span className="who">Sunny's agent</span>
                <span>·</span>
                <span className={`conf ${turn.confidence}`}>
                  <span className="dot" />
                  {turn.confidence} confidence
                </span>
              </div>
              <AnswerBody key={turn.key} text={turn.answer} onDone={() => setRevealed(true)} />
              {revealed && (
                <div className="turn-anim" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {turn.render === 'work' && <WorkResult projectSlugs={turn.projectSlugs} sources={turn.sources} onOpen={onOpen} />}
                  {turn.render === 'fit' && <MatchResume />}
                  {turn.render === 'about' && <AboutResult />}
                  <SourcePills sources={turn.sources} publications={turn.publications} />
                  <FollowupChips items={turn.followups} shownProjects={turn.projectSlugs} onAsk={onAsk} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
