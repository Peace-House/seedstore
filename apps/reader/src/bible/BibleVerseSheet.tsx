// Bottom-sheet popover that shows the verse text for a tapped reference.
// Web port of `lib/bible/widgets/bible_verse_sheet.dart`.
//
// Behaviour parity notes:
//   - Slides / fades in from the bottom; no scrim overlay (task #39 on
//     mobile — the sheet is meant to feel like a peek over the page, not
//     a modal interrupt).
//   - No "Open in YouVersion" button (task #40 on mobile).
//   - Translation chip strip lets the user switch translations on the fly;
//     "Read full chapter" re-fetches `BOOK.CH` and replaces the body.

import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_BIBLE_ID,
  fetchLicensedVersions,
  fetchPassage,
  VerseUnit,
} from './bibleService'
import { BibleRef, labelForRef } from './refParser'
import { usfmDisplayNames } from './usfmAliases'

interface Translation {
  id: number
  abbr: string
  // Long-form name shown in the "More ▾" dropdown.
  name?: string
}

// Fallback quick-access chips — only used if the licensed-versions fetch
// from the backend fails (offline / API down). Normally the chips are the
// first few entries of the licensed list. Kept short so they don't crowd
// the sheet header.
const TRANSLATIONS: Translation[] = [
  { id: 3034, abbr: 'BSB' },
  { id: 1, abbr: 'KJV' },
  { id: 114, abbr: 'NKJV' },
  { id: 111, abbr: 'NIV' },
  { id: 59, abbr: 'ESV' },
]

// Fallback extended list for the "More ▾" dropdown — only used if the
// licensed-versions fetch fails. Normally the dropdown shows the remaining
// licensed versions. Each `id` matches a `bible.com/bible/<id>/…` URL.
const EXTRA_TRANSLATIONS: Translation[] = [
  { id: 116, abbr: 'NLT', name: 'New Living Translation' },
  { id: 1713, abbr: 'CSB', name: 'Christian Standard Bible' },
  { id: 2692, abbr: 'NASB2020', name: 'New American Standard Bible 2020' },
  { id: 1588, abbr: 'AMP', name: 'Amplified Bible' },
  { id: 97, abbr: 'MSG', name: 'The Message' },
  { id: 37, abbr: 'GNT', name: 'Good News Translation' },
  { id: 107, abbr: 'NET', name: 'New English Translation' },
  { id: 392, abbr: 'CEV', name: 'Contemporary English Version' },
  { id: 110, abbr: 'NIRV', name: "New International Reader's Version" },
  { id: 206, abbr: 'WEB', name: 'World English Bible' },
  { id: 12, abbr: 'ASV', name: 'American Standard Version' },
  { id: 130, abbr: 'NCV', name: 'New Century Version' },
  { id: 463, abbr: 'NABRE', name: 'New American Bible, Revised Edition' },
  { id: 100, abbr: 'NASB1995', name: 'New American Standard Bible 1995' },
  { id: 2407, abbr: 'CEB', name: 'Common English Bible' },
]

// Preferred quick-access chips (by abbreviation), in display order. These
// surface as the default chips when licensed; anything else goes in the
// searchable "More" list. Lower index = higher priority.
const PREFERRED_CHIPS: string[] = ['AMP', 'ASV', 'TPT', 'EASY', 'BSB']

function popularityRank(abbr: string): number {
  const i = PREFERRED_CHIPS.indexOf(abbr.toUpperCase())
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

const VERSION_PREF_KEY = 'ls_bible_version_v1'

export interface BibleVerseSheetProps {
  open: boolean
  onClose: () => void
  bibleRef: BibleRef | null
}

export function BibleVerseSheet({
  open,
  onClose,
  bibleRef: ref,
}: BibleVerseSheetProps): JSX.Element | null {
  // Hydrate the user's last-picked version from localStorage so the
  // selection sticks between book sessions. Falls back to the
  // configured default when there's no stored value or it parses to
  // NaN (very old/foreign stored data).
  const [bibleId, setBibleId] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_BIBLE_ID
    const stored = window.localStorage.getItem(VERSION_PREF_KEY)
    const n = stored == null ? NaN : Number(stored)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_BIBLE_ID
  })
  const [chapterMode, setChapterMode] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [verseText, setVerseText] = useState<string>('')
  const [verses, setVerses] = useState<VerseUnit[]>([])
  console.log('verse units', verses)
  console.log('verse text', verseText)
  const [reference, setReference] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  // Controls visibility of the extended-versions dropdown ("More ▾").
  const [moreOpen, setMoreOpen] = useState<boolean>(false)
  // Licensed versions fetched from the backend. `null` until loaded (or if
  // the fetch fails), in which case we fall back to the built-in lists so
  // the picker is never empty.
  const [licensed, setLicensed] = useState<Translation[] | null>(null)
  // Search query for the "More" version list.
  const [versionQuery, setVersionQuery] = useState<string>('')
  // Tracks in-flight requests so a slow earlier fetch can't overwrite the
  // result of a faster later one (translation switching, chapter toggle).
  const requestId = useRef(0)

  // Persist the active translation as the user switches between
  // versions. Skipped on the very first render to avoid wiping out
  // a fresh default with the same default.
  const firstMount = useRef(true)
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false
      return
    }
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(VERSION_PREF_KEY, String(bibleId))
    } catch {
      // localStorage may throw in private-mode iframes; ignore.
    }
  }, [bibleId])

  // Load the licensed version list once on mount. On failure we keep
  // `licensed` null and fall back to the built-in arrays.
  useEffect(() => {
    let cancelled = false
    void fetchLicensedVersions().then((list) => {
      if (!cancelled && list && list.length) setLicensed(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Full set of versions to choose from — the licensed list when loaded,
  // otherwise the built-in fallback so the picker is never empty.
  const allVersions: Translation[] = licensed ?? [
    ...TRANSLATIONS,
    ...EXTRA_TRANSLATIONS,
  ]

  // Quick-access chips = the most popular licensed versions (so the common
  // ones are one click away). The user picks anything else from "More".
  const chipVersions = [...allVersions]
    .sort((a, b) => {
      const r = popularityRank(a.abbr) - popularityRank(b.abbr)
      return r !== 0 ? r : a.abbr.localeCompare(b.abbr)
    })
    .slice(0, 5)

  // "More" list = every version, alphabetical (backend already sorts, but we
  // re-sort to be safe for the fallback list), filtered by the search box.
  const moreVersions = (() => {
    const q = versionQuery.trim().toLowerCase()
    return [...allVersions]
      .sort((a, b) => a.abbr.localeCompare(b.abbr))
      .filter(
        (t) =>
          q === '' ||
          t.abbr.toLowerCase().includes(q) ||
          (t.name ?? '').toLowerCase().includes(q),
      )
  })()

  // Whether the active version is shown as a chip (controls the "More"
  // button's pressed/label state).
  const activeInChips = chipVersions.some((t) => t.id === bibleId)

  // Helper for changing the version from any picker (chip or
  // dropdown). Always closes the dropdown.
  const selectVersion = useCallback((id: number) => {
    setBibleId(id)
    setMoreOpen(false)
  }, [])

  // Reset transient UI state whenever a fresh ref comes in.
  useEffect(() => {
    if (open && ref) {
      setChapterMode(false)
      setError(null)
    }
  }, [open, ref])

  const activeUsfm = (() => {
    if (!ref) return ''
    return chapterMode ? `${ref.book}.${ref.chapter}` : ref.usfm
  })()

  // Drive the actual fetch off `ref`, `bibleId`, and `chapterMode`. Cleanup
  // bumps `requestId` so a late response is ignored.
  useEffect(() => {
    if (!open || !ref) return

    const myId = ++requestId.current
    setLoading(true)
    setError(null)
    setVerseText('')
    setVerses([])
    setReference('')

    void fetchPassage({ usfm: activeUsfm, bibleId }).then((res) => {
      if (myId !== requestId.current) return
      setLoading(false)
      if (!res.verseText) {
        setError('Could not load this verse.')
      } else {
        setVerseText(res.verseText)
        console.log('fetched res', res)
        setVerses(res.verses)
        setReference(res.reference)
      }
    })

    return () => {
      // Mark any in-flight response as stale.
      requestId.current = myId + 1
    }
    // `activeUsfm` is derived from `ref` + `chapterMode`, both already deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ref, bibleId, chapterMode])

  // Esc closes the sheet — matches the swipe-down dismiss on mobile.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (moreOpen) {
          setMoreOpen(false)
          return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, moreOpen])

  // Dismiss the More dropdown when the user clicks outside of it.
  // The dropdown is anchored inline (no portal) so we can use a
  // simple ref-based contains check.
  const moreWrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!moreOpen) return
    const onDocDown = (e: MouseEvent) => {
      const node = moreWrapRef.current
      if (node && e.target instanceof Node && !node.contains(e.target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [moreOpen])

  if (!open || !ref) return null

  const bookName = usfmDisplayNames[ref.book] ?? ref.book
  const fallbackLabel = labelForRef(ref)
  const title =
    reference || (chapterMode ? `${bookName} ${ref.chapter}` : fallbackLabel)

  // No scrim — we pass through clicks on the page behind the sheet.
  // The sheet root sits at the bottom, centered horizontally on wide
  // viewports, full-width on mobile. `pointer-events-none` on the outer
  // wrapper plus `pointer-events-auto` on the sheet itself keeps the
  // book underneath interactive when the sheet doesn't cover it.
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-2 pb-2 sm:px-4 sm:pb-4"
      aria-hidden={!open}
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-label={title}
        className={
          'pointer-events-auto w-full max-w-2xl rounded-2xl bg-white text-gray-900 shadow-2xl ring-1 ring-black/5 ' +
          'dark:bg-neutral-900 dark:text-neutral-100 dark:ring-white/10 ' +
          'transition-all duration-200 ease-out ' +
          (open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0')
        }
      >
        {/* Drag-handle visual cue (cosmetic on web). */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-gray-300 dark:bg-neutral-700" />
        </div>

        <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
          {/* Header row: title + close. */}
          <div className="flex items-start gap-3">
            <h2 className="flex-1 text-base font-semibold leading-snug sm:text-lg">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="15" y1="5" x2="5" y2="15" />
              </svg>
            </button>
          </div>

          {/* Translation chip strip + "More" picker. The 5 quick
              chips cover the most common English versions; the
              dropdown surfaces a longer list of YouVersion ids
              (NLT, CSB, NASB, MSG, etc.). When the active version
              lives in the dropdown rather than the chips, the More
              button itself shows that abbreviation as a pressed
              chip so the user can see what they picked at a glance. */}
          <div
            ref={moreWrapRef}
            className="relative mt-2 flex flex-wrap items-center gap-1.5"
          >
            {chipVersions.map((t) => {
              const selected = t.id === bibleId
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectVersion(t.id)}
                  className={
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ' +
                    (selected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-300')
                  }
                  aria-pressed={selected}
                >
                  {t.abbr}
                </button>
              )
            })}
            {(() => {
              // When the active version isn't one of the quick chips, show its
              // abbreviation on the "More" button so the user can see their
              // current pick at a glance.
              const activeVersion = allVersions.find((t) => t.id === bibleId)
              const moreLabel =
                !activeInChips && activeVersion ? activeVersion.abbr : 'More'
              const morePressed = !activeInChips && !!activeVersion
              return (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen((v) => !v)
                    setVersionQuery('')
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={moreOpen}
                  aria-pressed={morePressed}
                  className={
                    'inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ' +
                    (morePressed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-300')
                  }
                >
                  {moreLabel}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    // Caret starts pointing down (collapsed) and
                    // flips up when the dropdown opens upward.
                    className={
                      'transition-transform ' + (moreOpen ? '-rotate-180' : '')
                    }
                  >
                    <polyline points="3 5 6 8 9 5" />
                  </svg>
                </button>
              )
            })()}

            {moreOpen ? (
              // Listbox-style popover. The sheet is anchored to
              // the bottom of the viewport, so dropping the
              // popover DOWN from the chip strip (top-full) often
              // pushed it past the bottom of the visible area —
              // it would clip when the sheet was short. Open it
              // UPWARD instead (`bottom-full mb-2`) so the list
              // unfolds into the always-empty space above the
              // sheet on the reader page. Stays anchored to the
              // chip-strip wrapper for click-outside dismiss.
              <div
                role="listbox"
                aria-label="Choose a Bible version"
                className="absolute left-0 bottom-full z-10 mb-2 flex max-h-72 w-64 flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10"
              >
                {/* Search box — filters the full version list as you type. */}
                <div className="sticky top-0 border-b border-black/5 bg-white p-2 dark:border-white/10 dark:bg-neutral-900">
                  <input
                    type="text"
                    autoFocus
                    value={versionQuery}
                    onChange={(e) => setVersionQuery(e.target.value)}
                    placeholder="Search versions"
                    aria-label="Search Bible versions"
                    className="w-full rounded-md bg-gray-100 px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/40 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                  />
                </div>
                <div className="overflow-y-auto p-1">
                  {moreVersions.length === 0 ? (
                    <p className="px-2.5 py-3 text-center text-xs text-gray-400 dark:text-neutral-500">
                      No versions found
                    </p>
                  ) : null}
                  {moreVersions.map((t) => {
                    const selected = t.id === bibleId
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => selectVersion(t.id)}
                        className={
                          'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ' +
                          (selected
                            ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-neutral-200 dark:hover:bg-neutral-800')
                        }
                      >
                        <span className="font-semibold">{t.abbr}</span>
                        {t.name ? (
                          <span className="truncate text-[11px] text-gray-500 dark:text-neutral-400">
                            {t.name}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Body. */}
          <div className="mt-3 max-h-[55vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-6 text-sm text-gray-500 dark:text-neutral-400">
                Loading…
              </div>
            ) : error ? (
              <div className="py-2 text-sm text-gray-600 dark:text-neutral-400">
                {error}
              </div>
            ) : verses.length > 0 ? (
              // Parsed verse units — render each verse number as a small
              // superscript before its text.
              <p className="text-[15px] leading-relaxed">
                {verses.map((v, i) => (
                  <span key={`${v.num}-${i}`}>
                    {v.num ? (
                      <sup className="mr-0.5 align-super text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {v.num}
                      </sup>
                    ) : null}
                    <span>{v.text} </span>
                  </span>
                ))}
              </p>
            ) : verseText.trim() ? (
              // Fallback: plain text when the HTML had no parseable verse
              // labels. `whitespace-pre-wrap` preserves any inline spacing.
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {verseText}
              </p>
            ) : (
              <div className="py-2 text-sm text-gray-500 dark:text-neutral-400">
                No verse text available.
              </div>
            )}
          </div>

          {/* Read-full-chapter toggle. */}
          {/* <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleToggleChapter}
              disabled={loading}
              className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-600/10 disabled:opacity-50 dark:text-emerald-300"
            >
              {chapterMode
                ? `Show only ${fallbackLabel}`
                : 'Read full chapter'}
            </button>
          </div> */}
        </div>
      </div>
    </div>
  )
}

export default BibleVerseSheet
