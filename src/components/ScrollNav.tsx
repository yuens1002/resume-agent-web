import { useEffect, useRef, useState } from 'react'

interface Props {
  topId: string
  bottomId: string
}

export function ScrollNav({ topId, bottomId }: Props) {
  const [scrolledPast, setScrolledPast] = useState(false)
  const [atBottom, setAtBottom] = useState(false)
  const obsRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target.id === topId) setScrolledPast(!e.isIntersecting)
          if (e.target.id === bottomId) setAtBottom(e.isIntersecting)
        }
      },
      { threshold: 0 },
    )
    const top = document.getElementById(topId)
    const bottom = document.getElementById(bottomId)
    if (top) obsRef.current.observe(top)
    if (bottom) obsRef.current.observe(bottom)
    return () => obsRef.current?.disconnect()
  }, [topId, bottomId])

  if (!scrolledPast || atBottom) return null

  return (
    <button
      className="scroll-nav"
      onClick={() => document.getElementById(topId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      aria-label="Scroll to top"
    >
      ↑
    </button>
  )
}
