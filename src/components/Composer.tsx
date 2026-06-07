import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { Icon } from './Icon.tsx'
import { Chip } from './ui.tsx'
import { useProfile } from '../lib/profile-context.ts'
import { ScrollNav } from './ScrollNav.tsx'

export function Composer({ onAsk, showHints }: { onAsk: (q: string) => void; showHints: boolean }) {
  const profile = useProfile()
  const first = profile.contact.name.split(' ')[0]
  const hints = [`What are ${first}'s growth areas?`, `How does ${first} approach testing?`, `TypeScript experience?`, `How do I reach ${first}?`]
  const [v, setV] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const q = v.trim()
    if (!q) return
    onAsk(q)
    setV('')
    if (ref.current) ref.current.style.height = 'auto'
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }
  const grow = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const t = e.target
    t.style.height = 'auto'
    t.style.height = `${Math.min(t.scrollHeight, 120)}px`
    setV(t.value)
  }

  return (
    <div className="composer-wrap" style={{ position: 'relative' }}>
      <ScrollNav topId="scroll-top" bottomId="scroll-bottom" />
      <div className="composer">
        <textarea
          ref={ref}
          rows={1}
          value={v}
          placeholder={`Ask anything about ${first}…`}
          onChange={grow}
          onKeyDown={onKey}
        />
        <button className="send" onClick={submit} disabled={!v.trim()} aria-label="Send">
          <Icon name="send" />
        </button>
      </div>
      {showHints && (
        <div className="composer-hint">
          {hints.map((h) => (
            <Chip key={h} variant="mini" onClick={() => onAsk(h)}>
              {h}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
