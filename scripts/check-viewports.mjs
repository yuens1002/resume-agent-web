// Assert no page overflows horizontally at phone width, and report where if one does.
//
//   npm run build && npm start        # in one terminal
//   node scripts/check-viewports.mjs  # in another
//
// CLAUDE.md requires a ≤390px check on every change, but Claude-in-Chrome's resize_window
// has been observed reporting success without actually shrinking the OS window — so this
// drives a real headless viewport instead of trusting a screenshot.
//
// Routes come from /sitemap.xml, so newly published pages are covered automatically.
// Exits non-zero on overflow, which makes it usable as a gate.
import { chromium } from 'playwright-core'

const BASE = (process.env.CHECK_BASE ?? 'http://localhost:8787').replace(/\/$/, '')
const SIZES = [
  { label: '360', width: 360, height: 780 },
  { label: '390', width: 390, height: 844 },
  { label: '1280', width: 1280, height: 900 },
]

/** Route list from the live sitemap (falls back to "/" if it can't be read). */
async function routes() {
  try {
    const res = await fetch(`${BASE}/sitemap.xml`)
    if (!res.ok) throw new Error(`sitemap → ${res.status}`)
    const xml = await res.text()
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1]).pathname)
      .map((p) => (p === '' ? '/' : p))
    return [...new Set(paths)]
  } catch (e) {
    console.warn(`[warn] could not read sitemap (${e instanceof Error ? e.message : e}) — checking / only`)
    return ['/']
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const paths = await routes()
let bad = 0

for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height } })
  const page = await ctx.newPage()
  for (const path of paths) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 })
    const m = await page.evaluate(() => {
      const de = document.documentElement
      // Report the innermost offenders — an overflowing child widens every ancestor,
      // so the deepest elements are the ones actually worth fixing.
      const culprits = [...document.querySelectorAll('body *')]
        .filter((el) => el.scrollWidth > el.clientWidth + 1 && el.children.length === 0)
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className || '-'} (${el.scrollWidth}px)`)
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, culprits }
    })
    const overflow = m.scrollW > m.clientW
    if (overflow) bad++
    // Culprits only matter when the page actually overflows — an element whose scrollWidth
    // exceeds its box is normal for deliberate `text-overflow: ellipsis` truncation.
    console.log(
      `${overflow ? 'OVERFLOW' : 'ok      '} ${size.label.padEnd(5)} ${path.padEnd(34)} ${m.scrollW}/${m.clientW}` +
        (overflow && m.culprits.length ? `\n         → ${m.culprits.join(', ')}` : ''),
    )
  }
  await ctx.close()
}

await browser.close()
console.log(bad === 0 ? '\nPASS — no horizontal overflow' : `\nFAIL — ${bad} overflowing page/width combos`)
process.exit(bad === 0 ? 0 : 1)
