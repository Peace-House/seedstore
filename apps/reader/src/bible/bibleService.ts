// Bible passage client. Now points at the LivingSeed backend's
// `/bible/passages/:bibleId/:usfm` endpoint, which proxies to YouVersion
// server-side and caches results in Postgres. Previously this hit
// `api.youversion.com` directly and carried `NEXT_PUBLIC_YVP_APP_KEY` in
// the browser bundle — moving the key server-side means it no longer
// ships in client JS and the cache is shared across all platforms and
// users (web, mobile, future surfaces).
//
// Passages are immutable, so a cache hit is always authoritative. Cache
// state lives in module scope — there's one service for the whole tab; if
// the user reloads the page we re-fetch, which is fine.

const API_BASE: string =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NEXT_PUBLIC_API_BASE_URL) ||
  ''

/** Default translation id. BSB (3034) matches the mobile fallback. */
export const DEFAULT_BIBLE_ID: number = (() => {
  const raw =
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NEXT_PUBLIC_YVP_DEFAULT_BIBLE_ID
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3034
})()

/** A single verse: its number/label and its text. */
export interface VerseUnit {
  num: string
  text: string
}

export interface PassageCache {
  verseText: string
  reference: string
  verses: VerseUnit[]
  fetchedAt: number
}

// ── HTML passage parsing ───────────────────────────────────────────────────
// YouVersion's `format=html` wraps each verse in a span carrying its number in
// a `class="label"` child and the words in `class="content"`. We parse that
// into ordered { num, text } units so the UI can show verse numbers. The
// parser is tolerant: if it finds no labels it returns an empty `verses` array
// and the caller falls back to the plain stripped text (no regression).

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“')
    .replace(/&mdash;/g, '—')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
}

// Delimiter used to mark verse-number labels — chosen to never occur in
// scripture text so we can split on it after stripping tags.
const VERSE_DELIM = '|%V%|'

// Shared splitter: strips tags from delimiter-marked HTML and pairs each
// marked number with the text that follows it.
function splitMarked(marked: string): { verses: VerseUnit[]; text: string } {
  const s = decodeEntities(marked.replace(/<[^>]+>/g, ''))
  const parts = s.split(VERSE_DELIM)
  const verses: VerseUnit[] = []
  for (let i = 1; i < parts.length; i += 2) {
    const num = (parts[i] ?? '').replace(/\s+/g, ' ').trim()
    const text = (parts[i + 1] ?? '').replace(/\s+/g, ' ').trim()
    if (!num && !text) continue
    verses.push({ num, text })
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim()
  return { verses, text }
}

// Strategy 3 (markup-independent): YouVersion's HTML for many versions renders
// the verse number in an element with no class we can target, so after tag
// stripping the number ends up glued to the first word of the verse
// ("28Come…"). We split on a digit-run immediately followed by a letter, and
// only accept a number that continues the verse sequence (start, then +1, +2…).
// This rejects in-text numbers, which virtually always have a space after them
// ("5 loaves"), not a letter glued on.
function parseGluedSequential(stripped: string): VerseUnit[] {
  const re = /(\d+)([A-Za-z])/g
  const cands: { num: number; start: number; textStart: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped)) !== null) {
    const numStr = m[1] ?? ''
    cands.push({
      num: parseInt(numStr, 10),
      start: m.index,
      textStart: m.index + numStr.length,
    })
  }
  if (cands.length === 0) return []

  const chosen: typeof cands = []
  let expected: number | null = null
  for (const c of cands) {
    if (expected === null || c.num === expected) {
      chosen.push(c)
      expected = c.num + 1
    }
  }
  // Need at least two sequential verses to trust the heuristic.
  if (chosen.length < 2) return []

  const verses: VerseUnit[] = []
  for (let i = 0; i < chosen.length; i++) {
    const cur = chosen[i]!
    const end = i + 1 < chosen.length ? chosen[i + 1]!.start : stripped.length
    const text = stripped.slice(cur.textStart, end).replace(/\s+/g, ' ').trim()
    verses.push({ num: String(cur.num), text })
  }
  return verses
}

export function parseHtmlPassage(html: string): {
  verses: VerseUnit[]
  text: string
} {
  if (!html) return { verses: [], text: '' }
  // Drop footnote / cross-reference spans up front.
  const base = html.replace(
    /<span[^>]*class="[^"]*\bnote\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    '',
  )

  // Strategy 1: verse-number labels (YouVersion's documented shape).
  const byLabel = splitMarked(
    base.replace(
      /<span[^>]*class="[^"]*\blabel\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
      `${VERSE_DELIM}$1${VERSE_DELIM}`,
    ),
  )
  if (byLabel.verses.length > 0) return byLabel

  // Strategy 2: verse span openings with data-usfm ending in ".<number>".
  const byUsfm = splitMarked(
    base.replace(
      /<span[^>]*\bdata-usfm="[^"]*?\.(\d+)[a-zA-Z]?"[^>]*>/gi,
      `${VERSE_DELIM}$1${VERSE_DELIM}`,
    ),
  )
  if (byUsfm.verses.length > 0) return byUsfm

  // Strategy 3: numbers glued to verse text in the stripped output.
  const stripped = decodeEntities(base.replace(/<[^>]+>/g, ''))
  const text = stripped.replace(/\s+/g, ' ').trim()
  const glued = parseGluedSequential(stripped)
  if (glued.length > 0) return { verses: glued, text }

  // Fallback: no verse markers — return stripped plain text.
  return { verses: [], text }
}

export interface FetchPassageOptions {
  usfm: string
  bibleId?: number
}

export interface FetchPassageResult {
  verseText: string
  reference: string
  verses: VerseUnit[]
}

const passageCache = new Map<string, PassageCache>()

function cacheKey(bibleId: number, usfm: string): string {
  return `${bibleId}:${usfm}`
}

/**
 * Fetch a passage by USFM id ("JHN.3.16", "EXO.20.1-5", "PSA.23"). Requests
 * `format=html` so we can surface per-verse numbers (a range like 2TI.4.1-4
 * comes back as one block of text under `format=text`). Returns the parsed
 * verse units, the joined plain text (fallback), and the API's localised
 * reference label. On network failure with nothing cached, the result is
 * empty — the caller surfaces a "couldn't load" state.
 */
export async function fetchPassage(
  opts: FetchPassageOptions,
): Promise<FetchPassageResult> {
  const bibleId = opts.bibleId ?? DEFAULT_BIBLE_ID
  const key = cacheKey(bibleId, opts.usfm)

  const cached = passageCache.get(key)
  if (cached) {
    return {
      verseText: cached.verseText,
      reference: cached.reference,
      verses: cached.verses,
    }
  }

  // Backend proxy — `/bible/passages/:bibleId/:usfm` returns the same
  // `{ reference, content, fetchedAt, ... }` shape, but with no client-
  // side YouVersion key. Backend caches per-(bibleId, usfm) so this is
  // typically a single Postgres read in production after the first
  // user to view a given passage has warmed the cache.
  const url = `${API_BASE}/bible/passages/${bibleId}/${encodeURIComponent(
    opts.usfm,
  )}`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      // 4xx/5xx — leave the cache untouched and return an empty result so
      // the sheet shows the error state.
      return { verseText: '', reference: '', verses: [] }
    }
    const json = (await res.json()) as {
      reference?: unknown
      content?: unknown
    }
    const rawContent = typeof json.content === 'string' ? json.content : ''
    const reference = typeof json.reference === 'string' ? json.reference : ''
    const { verses, text } = parseHtmlPassage(rawContent)

    if (text) {
      // Don't cache empty bodies — let a real fetch be retried next time.
      passageCache.set(key, {
        verseText: text,
        reference,
        verses,
        fetchedAt: Date.now(),
      })
    }
    return { verseText: text, reference, verses }
  } catch {
    return { verseText: '', reference: '', verses: [] }
  }
}

/** Test / hot-reload helper. Not used in production. */
export function _clearPassageCache(): void {
  passageCache.clear()
}

// ── Licensed version list ──────────────────────────────────────────────────

/** A Bible version as needed by the picker. */
export interface LicensedVersion {
  id: number
  abbr: string
  name?: string
}

/**
 * Fetch the Bible versions the platform is *licensed* for from the LivingSeed
 * backend (`GET /bible/versions`). The backend syncs this list from YouVersion
 * daily, so building the picker from it guarantees every offered version
 * actually resolves. Returns `null` on failure so the caller can fall back to
 * its built-in list rather than showing an empty picker.
 */
export async function fetchLicensedVersions(): Promise<
  LicensedVersion[] | null
> {
  const apiBase =
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.NEXT_PUBLIC_API_BASE_URL) ||
    ''
  if (!apiBase) return null

  try {
    const res = await fetch(`${apiBase}/bible/versions`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { versions?: unknown }
    if (!Array.isArray(json.versions)) return null

    const versions = json.versions
      .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
      // English-only for now — defends against a stale backend cache that may
      // still contain other languages. `language_tag` is "en"/"en-US"/"eng".
      .filter((v) => {
        const tag =
          typeof v.language_tag === 'string'
            ? v.language_tag.toLowerCase()
            : ''
        return tag === '' || tag.startsWith('en')
      })
      .map((v): LicensedVersion | null => {
        const id =
          typeof v.id === 'number'
            ? v.id
            : typeof v.id === 'string'
              ? parseInt(v.id, 10)
              : NaN
        if (!Number.isFinite(id) || id <= 0) return null
        const abbr =
          (typeof v.abbreviation === 'string' && v.abbreviation) ||
          (typeof v.localized_abbreviation === 'string' &&
            v.localized_abbreviation) ||
          String(id)
        const name =
          (typeof v.title === 'string' && v.title) ||
          (typeof v.localized_title === 'string' && v.localized_title) ||
          undefined
        return { id, abbr, name }
      })
      .filter((v): v is LicensedVersion => v !== null)

    return versions.length ? versions : null
  } catch {
    return null
  }
}
