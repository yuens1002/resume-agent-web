import { useEffect, useState } from 'react'
import type { Turn as TurnType } from '../lib/types.ts'
import { INSTANT } from '../lib/motion.ts'
import { sanitizeAnswer } from '../lib/answer.ts'
import { Avatar, SourcePills, FollowupChips } from './ui.tsx'
import { WorkResult, AboutResult } from './cards.tsx'
import { MatchResume } from './MatchResume.tsx'

/* Markdown-lite: bold spans only (no lists/headings/links — no design surface for those). */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(seg)
    return m ? <strong key={i}>{m[1]}</strong> : seg
  })
}

/* Split on blank lines into paragraphs; cursor rides the last one while typing. */
function renderRich(text: string, done: boolean) {
  const paras = text.split(/\n{2,}/)
  return (
    <div className="answer-rich">
      {paras.map((p, i) => (
        <p className="prose" key={i}>
          {renderInline(p)}
          {!done && i === paras.length - 1 && <span className="cursor" />}
        </p>
      ))}
    </div>
  )
}

/* Token-by-token reveal (skipped under reduced-motion / ?instant). Sanitizes the
   backend's cited answer to clean prose, and adapts speed so long answers finish
   in ~2.5s instead of crawling token-by-token. */
function AnswerBody({ text, onDone }: { text: string; onDone?: () => void }) {
  const clean = sanitizeAnswer(text)
  const [shown, setShown] = useState(INSTANT ? clean : '')
  const [done, setDone] = useState(INSTANT)

  useEffect(() => {
    if (INSTANT) {
      onDone?.()
      return
    }
    const tokens = clean.split(/(\s+)/)
    const step = Math.max(2, Math.ceil(tokens.length / 120)) // cap total reveal at ~2.5s
    let i = 0
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (cancelled) return
      i += step
      setShown(tokens.slice(0, i).join(''))
      if (i < tokens.length) timer = setTimeout(tick, 22)
      else {
        setDone(true)
        onDone?.()
      }
    }
    const start = setTimeout(tick, 160)
    return () => {
      cancelled = true
      clearTimeout(start)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return renderRich(shown, done)
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
