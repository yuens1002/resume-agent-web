import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { Icon } from './Icon.tsx'
import { Chip } from './ui.tsx'

const HINTS = ['TypeScript experience?', 'Accessibility work?', 'How do you test?', 'How do I reach you?']

export function Composer({ onAsk, showHints }: { onAsk: (q: string) => void; showHints: boolean }) {
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
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={ref}
          rows={1}
          value={v}
          placeholder="Ask me anything about my work…"
          onChange={grow}
          onKeyDown={onKey}
        />
        <button className="send" onClick={submit} disabled={!v.trim()} aria-label="Send">
          <Icon name="send" />
        </button>
      </div>
      {showHints && (
        <div className="composer-hint">
          {HINTS.map((h) => (
            <Chip key={h} variant="mini" onClick={() => onAsk(h)}>
              {h}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
