import { useCallback, useEffect, useRef, useState } from 'react'

const THRESHOLD = 80    // px net travel in one direction before showing
const IDLE_MS   = 2500  // ms of no scroll before auto-hiding

interface Props {
  topId: string
  bottomId: string
}

function inViewport(id: string): boolean {
  const el = document.getElementById(id)
  if (!el) return false
  const { top, bottom } = el.getBoundingClientRect()
  return top <= window.innerHeight && bottom >= 0
}

export function ScrollNav({ topId, bottomId }: Props) {
  const [show, setShow] = useState<'up' | 'down' | null>(null)
  const showRef    = useRef<'up' | 'down' | null>(null)
  const lastY      = useRef(typeof window !== 'undefined' ? window.scrollY : 0)
  const dirStartY  = useRef(lastY.current)   // scrollY when current direction settled
  const lastDir    = useRef<'up' | 'down' | null>(null)
  const idle       = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  showRef.current  = show

  // Hide when the user naturally arrives at the destination sentinel
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        if (e.target.id === topId    && showRef.current === 'up')   setShow(null)
        if (e.target.id === bottomId && showRef.current === 'down') setShow(null)
      }
    }, { threshold: 0 })
    const top    = document.getElementById(topId)
    const bottom = document.getElementById(bottomId)
    if (top)    obs.observe(top)
    if (bottom) obs.observe(bottom)
    return () => obs.disconnect()
  }, [topId, bottomId])

  const onScroll = useCallback(() => {
    const y     = window.scrollY
    const delta = y - lastY.current
    if (delta === 0) return

    const dir: 'up' | 'down' = delta > 0 ? 'down' : 'up'

    if (lastDir.current !== dir) {
      // Direction changed — anchor a new start point, hide current button
      lastDir.current = dir
      dirStartY.current = lastY.current
      setShow(null)
    }

    lastY.current = y

    // Net distance traveled in the current direction
    const traveled = Math.abs(y - dirStartY.current)

    if (traveled >= THRESHOLD) {
      // Only show if NOT already at the destination
      if (dir === 'up'   && !inViewport(topId))    setShow('up')
      if (dir === 'down' && !inViewport(bottomId)) setShow('down')
    }

    clearTimeout(idle.current)
    idle.current = setTimeout(() => setShow(null), IDLE_MS)
  }, [topId, bottomId])

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(idle.current)
    }
  }, [onScroll])

  const navigate = () => {
    document.getElementById(show === 'up' ? topId : bottomId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setShow(null)
  }

  if (!show) return null

  return (
    <button
      className="scroll-nav"
      onClick={navigate}
      aria-label={show === 'up' ? 'Scroll to top' : 'Scroll to latest'}
    >
      {show === 'up' ? '↑' : '↓'}
    </button>
  )
}
