// Talks to the YouVersion Platform Bible API. Web port of
// `lib/bible/services/bible_service.dart` — same endpoint + headers, but
// uses `fetch` instead of Dio and an in-memory `Map` cache instead of Drift.
//
// The YouVersion app key is read from `NEXT_PUBLIC_YVP_APP_KEY`. It travels
// in the `X-YVP-App-Key` header on every request. The default Bible id
// (e.g. 3034 = BSB) comes from `NEXT_PUBLIC_YVP_DEFAULT_BIBLE_ID`.
//
// Passages are immutable, so a cache hit is always authoritative. Cache
// state lives in module scope — there's one service for the whole tab; if
// the user reloads the page we re-fetch, which is fine.

const API_BASE = 'https://api.youversion.com'

const APP_KEY: string =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NEXT_PUBLIC_YVP_APP_KEY) ||
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

export interface PassageCache {
  verseText: string
  reference: string
  fetchedAt: number
}

export interface FetchPassageOptions {
  usfm: string
  bibleId?: number
}

export interface FetchPassageResult {
  verseText: string
  reference: string
}

const passageCache = new Map<string, PassageCache>()

function cacheKey(bibleId: number, usfm: string): string {
  return `${bibleId}:${usfm}`
}

/**
 * Fetch a passage by USFM id ("JHN.3.16", "EXO.20.1-5", "PSA.23"). Returns
 * the verse text and the API's localised reference label. On network
 * failure with nothing in the cache, the result has empty strings — the
 * caller surfaces a "couldn't load" state.
 */
export async function fetchPassage(
  opts: FetchPassageOptions,
): Promise<FetchPassageResult> {
  const bibleId = opts.bibleId ?? DEFAULT_BIBLE_ID
  const key = cacheKey(bibleId, opts.usfm)

  const cached = passageCache.get(key)
  if (cached) {
    return { verseText: cached.verseText, reference: cached.reference }
  }

  const url = `${API_BASE}/v1/bibles/${bibleId}/passages/${encodeURIComponent(
    opts.usfm,
  )}?format=text`

  try {
    const res = await fetch(url, {
      headers: {
        'X-YVP-App-Key': APP_KEY,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      // 4xx/5xx — leave the cache untouched and return an empty result so
      // the sheet shows the error state.
      return { verseText: '', reference: '' }
    }
    // The mobile parser only reads { id, reference, content } off the
    // body, so we do the same — tolerant of shape drift in other fields.
    const json = (await res.json()) as {
      reference?: unknown
      content?: unknown
    }
    const verseText = typeof json.content === 'string' ? json.content : ''
    const reference = typeof json.reference === 'string' ? json.reference : ''

    if (verseText) {
      // Don't cache empty bodies — let a real fetch be retried next time.
      passageCache.set(key, {
        verseText,
        reference,
        fetchedAt: Date.now(),
      })
    }
    return { verseText, reference }
  } catch {
    return { verseText: '', reference: '' }
  }
}

/** Test / hot-reload helper. Not used in production. */
export function _clearPassageCache(): void {
  passageCache.clear()
}
