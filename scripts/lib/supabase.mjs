// Shared Supabase Storage helpers for the one-off asset scripts (upload-covers,
// make-og-images). Credentials are read from the sibling resume-agent checkout's
// .env.local so no secret touches argv or stdout.
import { readFile } from 'node:fs/promises'

export const BUCKET = 'project-covers'

// scripts/lib/ → ../../.. is the parent of this repo, where resume-agent sits.
const ENV_PATH = new URL('../../../resume-agent/.env.local', import.meta.url)

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

/** Open a storage client against the public bucket. Throws if credentials are missing. */
export async function openStorage() {
  const env = parseEnv(await readFile(ENV_PATH, 'utf8'))
  const base = (env.SUPA_PROJECT_URL || '').replace(/\/$/, '')
  const key = env.SUPA_SERVICE_ROLE
  if (!base || !key) throw new Error('Missing SUPA_PROJECT_URL / SUPA_SERVICE_ROLE')
  const auth = { apikey: key, Authorization: `Bearer ${key}` }

  return {
    publicUrl: (name) => `${base}/storage/v1/object/public/${BUCKET}/${name}`,

    /** Create the public bucket; a pre-existing bucket is not an error. */
    async ensureBucket() {
      const res = await fetch(`${base}/storage/v1/bucket`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
      })
      const body = await res.text()
      console.log(`bucket: ${res.status} ${body.includes('already exists') ? '(exists)' : body.slice(0, 80)}`)
    },

    /** Upsert one object. Returns true on success. */
    async upload(name, bytes, contentType) {
      const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${name}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': contentType, 'x-upsert': 'true' },
        body: bytes,
      })
      const ok = res.status === 200
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} -> ${base}/storage/v1/object/public/${BUCKET}/${name}`)
      if (!ok) console.log('   ', (await res.text()).slice(0, 120))
      return ok
    },
  }
}
