/* Skip token-streaming + entrance animation when the visitor prefers reduced
   motion or passes ?instant=1 (matches the prototype). */
export const INSTANT: boolean = (() => {
  try {
    return (
      new URLSearchParams(location.search).has('instant') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  } catch {
    return false
  }
})()
