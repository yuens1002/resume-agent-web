// One-off: screenshot project demos via system Chrome, optimize to WebP in .covers/.
// Run: node scripts/capture-covers.mjs
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const TARGETS = [
  { slug: 'artisan-roast', url: 'https://demo.artisanroast.app' },
  { slug: 'artisan-roast-platform', url: 'https://artisanroast.app' },
  { slug: 'brew-guide', url: 'https://brew-guide-production.up.railway.app' },
]

const OUT = new URL('../.covers/', import.meta.url)

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  for (const { slug, url } of TARGETS) {
    const page = await ctx.newPage()
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(2500) // let hero/fonts/images settle
      const png = await page.screenshot({ type: 'png' })
      const webp = await sharp(png).resize({ width: 1100 }).webp({ quality: 80 }).toBuffer()
      await writeFile(new URL(`${slug}.webp`, OUT), webp)
      console.log(`OK   ${slug}  (${(webp.length / 1024).toFixed(0)} KB)`)
    } catch (e) {
      console.log(`FAIL ${slug}: ${e instanceof Error ? e.message : e}`)
    } finally {
      await page.close()
    }
  }
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
