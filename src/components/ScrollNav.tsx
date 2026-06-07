import { useCallback, useEffect, useRef, useState } from 'react'

const THRESHOLD = 100  // px of sustained scrolling in one direction before showing
const IDLE_MS   = 2500 // ms of no scroll before auto-hiding

interface Props {
  topId: string
  bottomId: string
}

export function ScrollNav({ topId, bottomId }: Props) {
  const [show, setShow] = useState<'up' | 'down' | null>(null)

  // Refs for scroll tracking — never stale in the listener
  const lastY   = useRef(typeof window !== 'undefined' ? window.scrollY : 0)
  const accum   = useRef(0)
  const lastDir = useRef<'up' | 'down' | null>(null)
  const idle    = useRef<ReturnType<typeof setTimeout>>()
  const showRef = useRef(show)
  showRef.current = show

  // Hide when the destination sentinel enters the viewport
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          if (e.target.id === topId  && showRef.current === 'up')   setShow(null)
          if (e.target.id === bottomId && showRef.current === 'down') setShow(null)
        }
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
      // Direction changed — restart accumulation, hide current button
      accum.current   = 0
      lastDir.current = dir
      setShow(null)
    }

    accum.current += Math.abs(delta)
    lastY.current  = y

    if (accum.current >= THRESHOLD) setShow(dir)

    clearTimeout(idle.current)
    idle.current = setTimeout(() => setShow(null), IDLE_MS)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(idle.current)
    }
  }, [onScroll])

  const navigate = () => {
    const id = show === 'up' ? topId : bottomId
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
