import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Turn as TurnType } from '../lib/types.ts'
import { INSTANT } from '../lib/motion.ts'
import { sanitizeAnswer } from '../lib/answer.ts'
import { Avatar, SourcePills, FollowupChips } from './ui.tsx'
import { WorkResult, AboutResult } from './cards.tsx'
import { MatchResume } from './MatchResume.tsx'

/* Render the agent's answer as on-brand markdown in the .richtext scope: sanitize
   the backend's cited text (drop [n] + the Sources block), then render real
   markdown (paragraphs, bold, lists, headings, tables…). No per-token typewriter —
   the answer fades/rises in (honors reduced motion), then cards/sources/follow-ups
   reveal just after. */
function AnswerBody({ text, onDone }: { text: string; onDone?: () => void }) {
  const clean = sanitizeAnswer(text)
  useEffect(() => {
    if (INSTANT) {
      onDone?.()
      return
    }
    const t = setTimeout(() => onDone?.(), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className={`richtext${INSTANT ? '' : ' answer-fade'}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{clean}</ReactMarkdown>
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
  onAsk: (q: string) => void
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
                  {turn.render === 'work' && <WorkResult onOpen={onOpen} />}
                  {turn.render === 'fit' && <MatchResume />}
                  {turn.render === 'about' && <AboutResult />}
                  <SourcePills sources={turn.sources} />
                  <FollowupChips items={turn.followups} onAsk={onAsk} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
