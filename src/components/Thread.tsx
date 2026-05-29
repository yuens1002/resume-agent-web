import { useEffect, useState } from 'react'
import type { Turn as TurnType } from '../lib/types.ts'
import { INSTANT } from '../lib/motion.ts'
import { Avatar, SourcePills, FollowupChips } from './ui.tsx'
import { WorkResult, AboutResult } from './cards.tsx'
import { MatchResume } from './MatchResume.tsx'

/* Token-by-token reveal of the agent's answer (skipped under reduced-motion / ?instant). */
function AnswerBody({ text, onDone }: { text: string; onDone?: () => void }) {
  const [shown, setShown] = useState(INSTANT ? text : '')
  const [done, setDone] = useState(INSTANT)

  useEffect(() => {
    if (INSTANT) {
      onDone?.()
      return
    }
    const tokens = text.split(/(\s+)/)
    let i = 0
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (cancelled) return
      i += 2
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

  return (
    <p className="prose">
      {shown}
      {!done && <span className="cursor" />}
    </p>
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
