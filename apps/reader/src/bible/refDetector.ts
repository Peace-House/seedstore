// In-DOM Bible reference detector. Walks text nodes, wraps matches in a
// styled span, attaches click handlers, and returns a cleanup function.
// Web port of `assets/js/bible_ref_detector.js` on mobile.
//
// Differences from the mobile detector:
//   - No `flutter_inappwebview` bridge; matches dispatch through a JS
//     callback supplied by the caller.
//   - No touchstart/touchend/pointerup compatibility dance — desktop and
//     mobile browsers both fire `click` reliably on inline spans.
//   - Idempotent guard lives on the document (`__lsBibleRefInstalled`)
//     and on individual spans (`.ls-bible-ref`).

import { parseBibleRefs, type BibleRef } from './refParser'

type OnTap = (usfm: string, original: string, ref: BibleRef) => void

// Mirror of REF_PATTERN in refParser.ts. We re-parse the matched substring
// through `parseBibleRefs` to get the canonical USFM, so this regex only
// has to LOCATE candidates — invalid ones get dropped by the parser.
const SCAN_REGEX =
  /\b(?:[123]|I{1,3})?\s*[A-Z][a-zA-Z]{1,12}\.?\s+\d{1,3}:\d{1,3}(?:[-–—]\d{1,3})?/g

const REF_CLASS = 'ls-bible-ref'
const INSTALL_FLAG = '__lsBibleRefInstalled'
const CLEANUP_FLAG = '__lsBibleRefCleanup'

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'A', 'CODE', 'PRE'])

function inlineStyle(): string {
  // Inline styles so we don't need a global stylesheet shipped with the
  // page. Matches the spec in the task brief.
  return (
    'cursor: pointer; ' +
    'color: inherit; ' +
    'text-decoration: underline dotted; ' +
    'text-underline-offset: 3px;'
  )
}

/**
 * True when `node` (or any ancestor) is something we should not decorate:
 * an existing ref wrapper, a script/style, an existing anchor, etc.
 */
function shouldSkip(node: Node): boolean {
  let p: Node | null = node.parentNode
  while (p && p.nodeType === 1) {
    const el = p as Element
    if (SKIP_TAGS.has(el.tagName)) return true
    if (el.classList && el.classList.contains(REF_CLASS)) return true
    p = el.parentNode
  }
  return false
}

/**
 * Decorate one text node — replace it with a fragment of text + ref spans
 * if matches are found. Returns the spans that were created so the caller
 * can attach listeners + remember them for cleanup.
 */
function decorateTextNode(
  node: Text,
  doc: Document,
  onTap: OnTap,
  spans: HTMLSpanElement[],
): void {
  const parent = node.parentNode
  if (!parent) return
  if (shouldSkip(node)) return

  const text = node.nodeValue
  if (!text || text.length < 4) return

  // Cheap pre-test: bail before doing the parse work if there's no chance
  // of a match in this node.
  SCAN_REGEX.lastIndex = 0
  if (!SCAN_REGEX.test(text)) return

  // Parse the full text — `parseBibleRefs` validates each candidate
  // against the alias map and returns only real refs in source order.
  const refs = parseBibleRefs(text)
  if (refs.length === 0) return

  // Walk the text and the (in-order) ref list together. Each ref's raw
  // substring must appear somewhere after our running cursor.
  const frag = doc.createDocumentFragment()
  let cursor = 0
  for (const ref of refs) {
    const idx = text.indexOf(ref.raw, cursor)
    if (idx < 0) continue
    if (idx > cursor) {
      frag.appendChild(doc.createTextNode(text.substring(cursor, idx)))
    }
    const span = doc.createElement('span')
    span.className = REF_CLASS
    span.setAttribute('data-yv', ref.usfm)
    span.setAttribute('data-yv-raw', ref.raw)
    span.setAttribute('style', inlineStyle())
    span.textContent = ref.raw
    span.addEventListener('click', (e) => {
      e.stopPropagation()
      onTap(ref.usfm, ref.raw, ref)
    })
    spans.push(span)
    frag.appendChild(span)
    cursor = idx + ref.raw.length
  }
  if (cursor === 0) return // nothing matched in this node after all
  if (cursor < text.length) {
    frag.appendChild(doc.createTextNode(text.substring(cursor)))
  }
  parent.replaceChild(frag, node)
}

/**
 * Walks `doc.body`, wrapping every Bible reference in a `.ls-bible-ref`
 * span and registering a click listener on each. Calling twice on the
 * same document is a no-op (idempotent).
 *
 * Returns a cleanup function that:
 *   - removes the click listeners (handled by node removal below),
 *   - unwraps every span back to a plain text node,
 *   - clears the idempotency flag so the detector can be re-installed.
 */
export function installBibleRefDetector(
  doc: Document,
  onTap: OnTap,
): () => void {
  // Idempotency: if already installed, return the existing cleanup so
  // callers don't accidentally double-wrap.
  const docAny = doc as unknown as Record<string, unknown>
  if (docAny[INSTALL_FLAG]) {
    const existing = docAny[CLEANUP_FLAG]
    if (typeof existing === 'function') {
      return existing as () => void
    }
    return () => undefined
  }
  docAny[INSTALL_FLAG] = true

  const body = doc.body || doc.documentElement
  const spans: HTMLSpanElement[] = []

  if (body) {
    // Collect first, mutate after — TreeWalker doesn't like in-place
    // subtree replacement mid-iteration.
    const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
    const textNodes: Text[] = []
    let n = walker.nextNode()
    while (n) {
      textNodes.push(n as Text)
      n = walker.nextNode()
    }
    for (const t of textNodes) {
      decorateTextNode(t, doc, onTap, spans)
    }
  }

  const cleanup = (): void => {
    for (const span of spans) {
      const parent = span.parentNode
      if (!parent) continue
      // Replace the span with a plain text node containing the original
      // matched substring. This preserves the user's reading flow and
      // makes re-install safe.
      const text = doc.createTextNode(
        span.getAttribute('data-yv-raw') || span.textContent || '',
      )
      parent.replaceChild(text, span)
      // Coalesce adjacent text nodes so re-running the detector sees
      // the same text it saw originally.
      if (parent.normalize) parent.normalize()
    }
    spans.length = 0
    delete docAny[INSTALL_FLAG]
    delete docAny[CLEANUP_FLAG]
  }

  docAny[CLEANUP_FLAG] = cleanup
  return cleanup
}
