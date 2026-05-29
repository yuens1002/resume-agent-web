import { useState } from 'react'
import { Icon } from './Icon.tsx'

/* Copy-to-clipboard menu row (e.g. the MCP endpoint). */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    try {
      navigator.clipboard?.writeText(value)
    } catch {
      /* ignore */
    }
    setDone(true)
    setTimeout(() => setDone(false), 1400)
  }
  return (
    <button className="menu-item" onClick={copy}>
      <span className="mi-ic">
        <Icon name="link" />
      </span>
      <span className="mi-main">
        <span className="mi-t">{label}</span>
        <span className="mi-s">{value.replace(/^https?:\/\//, '')}</span>
      </span>
      <span className="mi-act">{done ? 'copied ✓' : 'copy'}</span>
    </button>
  )
}
