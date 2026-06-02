// Parses free-form text containing one or more Bible references into a flat
// list of `BibleRef`s. Mirror of `lib/bible/services/bible_ref_parser.dart`
// on mobile.
//
// Handles the common shapes:
//   - "John 3:16"
//   - "Exo. 20:1"           (trailing dot abbreviation)
//   - "1 Cor. 13:4"         (numbered book with space)
//   - "1Cor 13:4"           (numbered book without space)
//   - "I Corinthians 13:4"  (Roman-numeral form)
//   - "John 3:16-17"        (verse range, hyphen / en-dash / em-dash)
//   - "Matt 6:14-15; Eph 4:32; Col 3:13"  (compound)
//
// Deliberately requires `chapter:verse` — bare chapter-only refs ("Psalm 23")
// are sacrificed to keep precision high in prose. Bare verse references
// ("verse 5") are also not promoted: false positives in the verse sheet
// would be much worse than misses.

import { resolveUsfmId, usfmDisplayNames } from './usfmAliases'

export interface BibleRef {
  /** The matched substring as it appeared in the input ("Exo. 20:1"). */
  raw: string
  /** USFM passage id understood by the YouVersion API ("EXO.20.1-5", "PSA.23"). */
  usfm: string
  /** 3-letter USFM book id ("GEN", "1CO", "JHN"). */
  book: string
  chapter: number
  verseStart: number
  /** Only set when the range end is strictly greater than `verseStart`. */
  verseEnd?: number
}

/*
 * Compiled once. Non-anchored so it matches multiple refs in a single string.
 *
 * Group breakdown:
 *   1: optional ordinal prefix         — "1", "2", "3", "I", "II", "III"
 *   2: book root                       — "Cor", "John", "Exodus", "Ps"
 *   3: chapter number                  — required
 *   4: verse start                     — required
 *   5: optional verse end (range)
 *
 * Word boundary at the start prevents matching mid-word ("Genesis" inside
 * "homogeneous" — unlikely but cheap to guard against). The book root is
 * matched liberally and validated against the alias map afterwards, so
 * non-book matches ("Mom 3:16") are dropped silently.
 */
const REF_PATTERN =
  /\b(?:([123]|I{1,3})\s*)?([A-Z][a-zA-Z]{1,12})\.?\s+(\d{1,3}):(\d{1,3})(?:[-–—](\d{1,3}))?/g

/**
 * Build the USFM passage id from a parsed ref's parts. Matches the
 * `BibleRef.usfm` getter on mobile.
 */
function buildUsfm(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number | undefined,
): string {
  if (verseEnd !== undefined && verseEnd > verseStart) {
    return `${book}.${chapter}.${verseStart}-${verseEnd}`
  }
  return `${book}.${chapter}.${verseStart}`
}

/**
 * Parse `text` and return every Bible reference found, in source order.
 * Compound references are returned as siblings.
 */
export function parseBibleRefs(text: string): BibleRef[] {
  if (!text) return []
  const results: BibleRef[] = []
  // Re-create the regex each call so we don't share `lastIndex` between
  // callers / re-entrant calls (the module-level one above is just the
  // pattern source; we clone it here).
  const re = new RegExp(REF_PATTERN.source, REF_PATTERN.flags)

  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const ordinal = m[1]
    const bookRoot = m[2]
    const chapterRaw = m[3]
    const vsRaw = m[4]
    const veRaw = m[5]
    // `m[0]` is the full-match string. Under `noUncheckedIndexedAccess`
    // every indexed read is widened to `T | undefined`, so we narrow
    // here once and use the local `raw` below.
    const raw = m[0]
    if (!raw || !bookRoot || !chapterRaw || !vsRaw) continue

    const chapter = parseInt(chapterRaw, 10)
    const verseStart = parseInt(vsRaw, 10)
    if (!Number.isFinite(chapter) || chapter < 1) continue
    if (!Number.isFinite(verseStart) || verseStart < 1) continue

    // Combine ordinal + root the same way the alias keys do ("1cor",
    // "iicor", "icorinthians"). `resolveUsfmId` strips dots and whitespace.
    const bookKey = ordinal ? `${ordinal}${bookRoot}` : bookRoot
    const book = resolveUsfmId(bookKey)
    if (!book) continue

    let verseEnd: number | undefined
    if (veRaw) {
      const ve = parseInt(veRaw, 10)
      if (Number.isFinite(ve) && ve > verseStart) verseEnd = ve
    }

    results.push({
      raw,
      usfm: buildUsfm(book, chapter, verseStart, verseEnd),
      book,
      chapter,
      verseStart,
      ...(verseEnd !== undefined ? { verseEnd } : {}),
    })
  }

  return results
}

/**
 * Convenience: a human-readable label for a ref, used as a fallback before
 * the API's localised `reference` field arrives.
 */
export function labelForRef(ref: BibleRef): string {
  const bookName = usfmDisplayNames[ref.book] ?? ref.book
  if (ref.verseEnd !== undefined && ref.verseEnd !== ref.verseStart) {
    return `${bookName} ${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`
  }
  return `${bookName} ${ref.chapter}:${ref.verseStart}`
}
