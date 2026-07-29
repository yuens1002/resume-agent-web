// Generate the site's Open Graph images.
//
//   node scripts/make-og-images.mjs            # both steps
//   node scripts/make-og-images.mjs default    # public/og-default.jpg only
//   node scripts/make-og-images.mjs covers     # per-project <slug>-og.jpg only
//
// Two outputs, both 1200×630 JPEG (the size every platform crops toward, and the format
// LinkedIn will actually render — it ignores WebP, which is what the project covers are):
//
//   1. public/og-default.jpg — a screenshot of the live site, committed to the repo and
//      served statically. Used for the homepage and any project without a cover.
//   2. <slug>-og.jpg — one per project that has a `cover`, derived from that cover and
//      uploaded beside it in the same public bucket. server/machine-surface.ts finds them
//      by transforming `cover` (.webp → -og.jpg), so nothing is hardcoded on either side.
//
// Both steps are driven by live backend data, so a fork produces its own images.
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { openStorage } from './lib/supabase.mjs'

const API_BASE = (process.env.RESUME_API_BASE ?? 'https://agent.yuens.me').replace(/\/$/, '')
const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://www.yuens.me').replace(/\/$/, '')
const W = 1200
const H = 630
const DEFAULT_OUT = new URL('../public/og-default.jpg', import.meta.url)

const toOgJpeg = (input, position) =>
  sharp(input).resize(W, H, { fit: 'cover', position }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()

/** Screenshot the live site at OG proportions → public/og-default.jpg. */
async function makeDefault() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    // ?instant=1 skips the typewriter/entrance animations, so the capture is deterministic.
    await page.goto(`${SITE_URL}/?instant=1`, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(1500) // let fonts settle
    const png = await page.screenshot({ type: 'png' })
    const jpg = await toOgJpeg(png, 'top')
    await writeFile(DEFAULT_OUT, jpg)
    console.log(`OK   og-default.jpg  (${(jpg.length / 1024).toFixed(0)} KB)  → public/`)
  } finally {
    await browser.close()
  }
}

/** Derive a 1200×630 JPEG from each project cover and upload it beside the original. */
async function makeCovers() {
  const res = await fetch(`${API_BASE}/info`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`/info → ${res.status}`)
  const { projects = [] } = await res.json()
  const targets = projects.filter((p) => p.cover?.endsWith('.webp'))
  if (targets.length === 0) {
    console.log('no projects have a .webp cover — nothing to derive')
    return
  }

  const storage = await openStorage()
  await storage.ensureBucket()
  for (const p of targets) {
    try {
      const src = await fetch(p.cover)
      if (!src.ok) throw new Error(`cover → ${src.status}`)
      const jpg = await toOgJpeg(Buffer.from(await src.arrayBuffer()), 'top')
      await storage.upload(`${p.slug}-og.jpg`, jpg, 'image/jpeg')
    } catch (e) {
      console.log(`FAIL ${p.slug}: ${e instanceof Error ? e.message : e}`)
    }
  }
}

const step = process.argv[2]
if (step && !['default', 'covers'].includes(step)) {
  console.error(`unknown step "${step}" — expected "default" or "covers"`)
  process.exit(1)
}
if (!step || step === 'default') await makeDefault()
if (!step || step === 'covers') await makeCovers()
