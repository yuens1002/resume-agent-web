// Preflight for the crawlable surface. Run before publishing new public URLs, and
// again whenever the backend corpus shifts — the pages are driven by live data, so
// "verified last week" means nothing.
//
//   npm run build && npm start            # in one terminal
//   node scripts/preflight-public-surface.mjs
//   PREFLIGHT_PRIVATE_REPOS=foo,bar node scripts/preflight-public-surface.mjs
//
// Exits non-zero on any finding, so it can gate a deploy.
//
// ── Why this prints and never writes ────────────────────────────────────────────
// This script reads the entire public corpus, which is precisely the data you do not
// want sitting in a file someone later commits. A previous scratch dump of this same
// corpus contained a live credential. So: stdout only. No report file, nothing to
// forget to delete.
//
// For the same reason findings report a match's TYPE and LOCATION, never its VALUE.
// A preflight that echoes the secret it found has moved the secret, not contained it.
//
// The private-repo list comes from the environment rather than source: this repo is
// public, and hardcoding the name of a private repo here would itself be the kind of
// disclosure the check exists to prevent. It also keeps a fork from inheriting names
// that mean nothing to it.

const SITE = (process.env.PREFLIGHT_SITE ?? 'http://localhost:8787').replace(/\/$/, '')
const API = (process.env.RESUME_API_BASE ?? 'https://agent.yuens.me').replace(/\/$/, '')
const LIVE = (process.env.PREFLIGHT_LIVE ?? 'https://www.yuens.me').replace(/\/$/, '')
const PRIVATE_REPOS = (process.env.PREFLIGHT_PRIVATE_REPOS ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)

let failures = 0
const results = []
const record = (ok, label, detail) => {
  if (!ok) failures++
  results.push({ ok, label, detail })
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const section = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}`)

/** Where a match sits, without revealing what it is. */
const locate = (content, re) => {
  const idx = content.search(re)
  if (idx === -1) return ''
  const line = content.slice(0, idx).split('\n').length
  return `line ${line}`
}

// Match TYPES only. The label is what gets printed; the value never is.
const SECRET_PATTERNS = [
  ['32+ hex literal', /\b[0-9a-f]{32,}\b/i],
  ['key/token assignment', /(api[_-]?key|secret|token|password)\s*[:=]\s*\S{12,}/i],
  ['auth header', /(x-[a-z-]*key|authorization|bearer)\s*[:=]\s*\S{8,}/i],
  ['provider token', /\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,})/],
  ['email address', /[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
  ['street address', /\b\d{3,6}\s+[A-Z][a-z]+\s+(Rd|Road|St|Street|Ave|Avenue|Dr|Drive|Ln|Lane|Blvd)\b/],
  ['phone number', /\b\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/],
]

const getJSON = async (url) => {
  const r = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.json()
}

/** Resolve `urls` with bounded concurrency; returns [{url, status, html}]. */
async function fetchAll(urls, limit = 8, wantBody = false) {
  const out = []
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, urls.length) }, async () => {
      while (i < urls.length) {
        const url = urls[i++]
        try {
          const r = await fetch(url)
          out.push({ url, status: r.status, html: wantBody ? await r.text() : '' })
        } catch (e) {
          out.push({ url, status: 0, html: '', error: e instanceof Error ? e.message : String(e) })
        }
      }
    }),
  )
  return out
}

console.log(`preflight — pages: ${SITE}  ·  api: ${API}  ·  live: ${LIVE}`)
if (!PRIVATE_REPOS.length) {
  console.log('note: PREFLIGHT_PRIVATE_REPOS is unset — the private-repo check will be skipped')
}

// ── 1. corpus content ──────────────────────────────────────────────────────────
// Scans the ALLOWLIST — the notes actually published — not the whole authored set.
// Scanning everything would drown real findings in notes that were never going to
// ship. The one check that does look at the whole set is the allowlist ratio below,
// because a filter that silently matched everything is the failure worth catching.
section('corpus')
let corpus = []
let authoredTotal = 0
const PUBLISH_TAG = (process.env.OBSERVATION_PUBLISH_TAG ?? 'publish').toLowerCase()
try {
  const body = await getJSON(`${API}/observations?authored=1&limit=500`)
  const authored = body.observations ?? []
  authoredTotal = authored.length
  corpus = authored.filter((o) => (o.topics ?? []).some((t) => t.toLowerCase() === PUBLISH_TAG))
  // Not a failure. Zero tagged is a legitimate, deliberate state — it ships the
  // project pages and publishes no notes — and gating on it would block that deploy.
  // The dangerous direction is the opposite one, checked immediately below.
  record(true, `notes tagged "${PUBLISH_TAG}"`, `${corpus.length} of ${authoredTotal} authored`)
  if (corpus.length === 0 && authoredTotal > 0) {
    console.log(`  NOTE   no note is tagged — this deploy publishes zero observation pages.`)
    console.log(`         Tag one via the private MCP by adding the "${PUBLISH_TAG}" topic.`)
  }
  // An allowlist that admits everything is a denylist wearing a hat. If the tag ever
  // ends up on the whole corpus, the deliberate-selection property is gone and this
  // should be looked at rather than shipped.
  record(
    authoredTotal === 0 || corpus.length < authoredTotal,
    'allowlist is selective',
    corpus.length === authoredTotal && authoredTotal > 0 ? 'every authored note is tagged — is that deliberate?' : '',
  )
  // The server filter is the thing keeping machine rows out; if it was silently
  // ignored we are scanning — and about to publish — the wrong set entirely.
  record(body.authored !== undefined, 'server applied ?authored', body.authored === undefined ? 'echo absent — backend predates the filter' : 'echo present')
  // Report the AUTHORED counts, not the published ones. Truncation happens upstream of
  // the allowlist, so `corpus.length` here would understate what was dropped — "showing
  // 3 of 158" when 3 is simply how many are tagged.
  record(
    !body.truncated,
    'corpus not truncated',
    body.truncated
      ? `API returned ${authoredTotal} of ${body.total} authored notes — raise the limit`
      : `${body.total} authored total`,
  )
} catch (e) {
  record(false, 'fetch authored corpus', e.message)
}

// ── 2. secret + PII sweep ──────────────────────────────────────────────────────
section('secret / PII sweep')
for (const [label, re] of SECRET_PATTERNS) {
  const hits = corpus.filter((o) => re.test(o.content ?? ''))
  record(
    hits.length === 0,
    label,
    hits.length === 0
      ? 'none'
      : hits.map((o) => `${o.id.slice(0, 8)}… (${locate(o.content, re)})`).join(', '),
  )
}

// ── 2b. publish-intent review ──────────────────────────────────────────────────
// A different kind of check from the sweep above. Those patterns match things that
// are unsafe by their nature — a key is a key. These match a document's SHAPE, to
// surface notes written as private working material even though nothing in them is
// secret: interview rehearsal, self-coaching, candid self-assessment.
//
// The case that motivated it read as ordinary professional content — topics
// "debugging, open source, self-assessment", no PII, no secrets, no private repo —
// yet it was prepared interview answers annotated with "Strong signal for: …" and an
// "Honest gap: …" admission. Every mechanical check passed it.
//
// Deliberately narrow. A broad pass over this corpus is useless: matching /recruiter/
// returned 14 hits of which ~13 were false, because a portfolio *about* fixing hiring
// legitimately discusses recruiters. So these key on authoring conventions and
// coaching annotations, not on subject matter.
//
// Reported, never failed. Intent is not machine-decidable — this can nominate a note
// for a human decision, and that is the whole of its job. The durable control is
// deciding at capture time (resume-agent#233), not filtering at publish time.
const INTENT_MARKERS = [
  ['interview rehearsal', /^\s*INTERVIEW PREP\b|\bA-GROUND\b/im],
  ['coaching annotation', /\bStrong signal for:|\bHonest gap:/i],
  ['rehearsed Q&A pairs', /\bQ:\s*["“][\s\S]{0,400}?\bA[-:]/],
]
section('publish-intent review')
{
  const flagged = new Map()
  for (const [label, re] of INTENT_MARKERS) {
    for (const o of corpus.filter((x) => re.test(x.content ?? ''))) {
      const prev = flagged.get(o.id) ?? []
      flagged.set(o.id, [...prev, label])
    }
  }
  if (flagged.size === 0) {
    record(true, 'no notes look like private working material', 'none')
  } else {
    // Not a failure: needs a human read, and a false positive here is cheap.
    console.log(`  REVIEW ${flagged.size} note(s) match a private-working-material shape:`)
    for (const [id, labels] of flagged) console.log(`      ${id.slice(0, 8)}… — ${labels.join(', ')}`)
    console.log('      Read each through the private MCP and decide. Mark private if it is')
    console.log('      working material rather than something written to be read.')
  }
}

// ── 3. private-repo mentions ───────────────────────────────────────────────────
section('private-repo mentions')
if (PRIVATE_REPOS.length) {
  for (const repo of PRIVATE_REPOS) {
    const re = new RegExp(repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const hits = corpus.filter((o) => re.test(o.content ?? ''))
    // Reported, not failed: a passing mention that reveals nothing can be a
    // legitimate keep. The judgment is the owner's; the surfacing is the script's.
    record(true, `mentions of "${repo}"`, hits.length === 0 ? 'none' : `${hits.length} → ${hits.map((o) => o.id.slice(0, 8) + '…').join(', ')}`)
  }
} else {
  console.log('  skipped')
}

// ── 4. sitemap integrity ───────────────────────────────────────────────────────
section('sitemap')
let sitemapUrls = []
try {
  const r = await fetch(`${SITE}/sitemap.xml`)
  const xml = await r.text()
  record(r.ok, 'sitemap responds', `${r.status} ${r.headers.get('content-type') ?? ''}`)
  record(/^\s*<\?xml/.test(xml), 'is XML, not the SPA shell')
  sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  record(sitemapUrls.length > 0, 'has URLs', `${sitemapUrls.length}`)
  record(new Set(sitemapUrls).size === sitemapUrls.length, 'no duplicate URLs')
  const origins = new Set(sitemapUrls.map((u) => new URL(u).origin))
  record(origins.size === 1, 'single origin', [...origins].join(', '))
} catch (e) {
  record(false, 'sitemap', e.message)
}

// ── 5. route health + per-page uniqueness ──────────────────────────────────────
section('routes')
const paths = sitemapUrls.map((u) => new URL(u).pathname)
const pages = await fetchAll(paths.map((p) => `${SITE}${p}`), 8, true)
const bad = pages.filter((p) => p.status !== 200)
record(bad.length === 0, 'all sitemap URLs return 200', bad.length ? bad.slice(0, 5).map((b) => `${new URL(b.url).pathname}→${b.status}`).join(', ') : `${pages.length} checked`)

const titles = new Map()
const canons = new Map()
let missingCanon = 0
for (const p of pages) {
  const t = /<title>([^<]*)<\/title>/.exec(p.html)?.[1] ?? ''
  const c = /<link rel="canonical" href="([^"]*)"/.exec(p.html)?.[1] ?? ''
  if (!c) missingCanon++
  titles.set(t, (titles.get(t) ?? 0) + 1)
  canons.set(c, (canons.get(c) ?? 0) + 1)
}
const dupTitles = [...titles.entries()].filter(([, n]) => n > 1)
const dupCanons = [...canons.entries()].filter(([, n]) => n > 1)
record(missingCanon === 0, 'every page has a canonical', missingCanon ? `${missingCanon} missing` : '')
record(dupCanons.length === 0, 'canonicals are unique', dupCanons.map(([c, n]) => `${c} ×${n}`).join(', '))
record(dupTitles.length === 0, 'titles are unique', dupTitles.map(([t, n]) => `"${t.slice(0, 40)}" ×${n}`).join(', '))
record(!pages.some((p) => p.html.includes('%VITE_SITE_URL%')), 'no unsubstituted %VITE_SITE_URL%')

// ── 6. what this deploy newly exposes ──────────────────────────────────────────
section('diff vs live')
try {
  const r = await fetch(`${LIVE}/sitemap.xml`)
  const xml = await r.text()
  const liveUrls = /^\s*<\?xml/.test(xml)
    ? [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
    : []
  const livePaths = new Set(liveUrls)
  const added = paths.filter((p) => !livePaths.has(p))
  const removed = [...livePaths].filter((p) => !paths.includes(p))
  console.log(`  live: ${liveUrls.length} URLs · pending: ${paths.length} URLs`)
  console.log(`  + ${added.length} newly public${added.length ? ':' : ''}`)
  added.slice(0, 10).forEach((p) => console.log(`      ${p}`))
  if (added.length > 10) console.log(`      … and ${added.length - 10} more`)
  if (removed.length) {
    // Live URLs that would 404 after this deploy — they may already be indexed.
    console.log(`  - ${removed.length} would disappear:`)
    removed.slice(0, 10).forEach((p) => console.log(`      ${p}`))
  }
} catch (e) {
  console.log(`  skipped — could not read live sitemap (${e.message})`)
}

// ── verdict ────────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? 'PASS' : `FAIL — ${failures} check(s)`} · ${results.length} checks`)
if (failures) console.log('Findings report type and location only. Inspect the named notes through the private MCP.')
process.exit(failures === 0 ? 0 : 1)
