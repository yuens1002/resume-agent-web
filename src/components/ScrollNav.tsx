import { useEffect, useRef, useState } from 'react'

interface Props {
  hasTurns: boolean
  topSentinelId: string
  bottomSentinelId: string
}

export function ScrollNav({ hasTurns, topSentinelId, bottomSentinelId }: Props) {
  const [topVisible, setTopVisible] = useState(true)
  const [bottomVisible, setBottomVisible] = useState(true)
  const obsRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target.id === topSentinelId) setTopVisible(e.isIntersecting)
          if (e.target.id === bottomSentinelId) setBottomVisible(e.isIntersecting)
        }
      },
      { threshold: 0 },
    )
    const top = document.getElementById(topSentinelId)
    const bottom = document.getElementById(bottomSentinelId)
    if (top) obsRef.current.observe(top)
    if (bottom) obsRef.current.observe(bottom)
    return () => obsRef.current?.disconnect()
  }, [topSentinelId, bottomSentinelId])

  const showUp = !topVisible
  const showDown = topVisible && hasTurns && !bottomVisible

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!showUp && !showDown) return null

  return (
    <button
      className={`scroll-nav${showUp ? ' scroll-nav--up' : ' scroll-nav--down'}`}
      onClick={() => scrollTo(showUp ? topSentinelId : bottomSentinelId)}
      aria-label={showUp ? 'Scroll to top' : 'Scroll to latest'}
    >
      {showUp ? '↑' : '↓'}
    </button>
  )
}
