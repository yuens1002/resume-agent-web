// One-off: create the public Supabase Storage bucket and upload .covers/*.webp.
// Credentials come from ../resume-agent/.env.local via scripts/lib/supabase.mjs, so no
// secret touches argv/stdout. Prints only the resulting public URLs.
// Run: node scripts/upload-covers.mjs
import { readFile, readdir } from 'node:fs/promises'
import { openStorage } from './lib/supabase.mjs'

async function main() {
  const storage = await openStorage()
  await storage.ensureBucket()

  const dir = new URL('../.covers/', import.meta.url)
  const files = (await readdir(dir)).filter((f) => f.endsWith('.webp'))
  for (const f of files) {
    await storage.upload(f, await readFile(new URL(f, dir)), 'image/webp')
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
