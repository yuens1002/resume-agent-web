// One-off: create a public Supabase Storage bucket and upload .covers/*.webp.
// Reads SUPA_PROJECT_URL + SUPA_SERVICE_ROLE from ../resume-agent/.env.local so
// no secret touches argv/stdout. Prints only the resulting public URLs.
// Run: node scripts/upload-covers.mjs
import { readFile, readdir } from 'node:fs/promises'

const BUCKET = 'project-covers'

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

async function main() {
  const env = parseEnv(await readFile(new URL('../../resume-agent/.env.local', import.meta.url), 'utf8'))
  const URL_BASE = (env.SUPA_PROJECT_URL || '').replace(/\/$/, '')
  const KEY = env.SUPA_SERVICE_ROLE
  if (!URL_BASE || !KEY) throw new Error('Missing SUPA_PROJECT_URL / SUPA_SERVICE_ROLE')
  const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` }

  // Create the public bucket (ignore "already exists").
  const mk = await fetch(`${URL_BASE}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  const mkBody = await mk.text()
  console.log(`bucket: ${mk.status} ${mkBody.includes('already exists') ? '(exists)' : mkBody.slice(0, 80)}`)

  const dir = new URL('../.covers/', import.meta.url)
  const files = (await readdir(dir)).filter((f) => f.endsWith('.webp'))
  for (const f of files) {
    const bytes = await readFile(new URL(f, dir))
    const up = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${f}`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'image/webp', 'x-upsert': 'true' },
      body: bytes,
    })
    console.log(`${up.status === 200 ? 'OK  ' : 'FAIL'} ${f} -> ${URL_BASE}/storage/v1/object/public/${BUCKET}/${f}`)
    if (up.status !== 200) console.log('   ', (await up.text()).slice(0, 120))
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
