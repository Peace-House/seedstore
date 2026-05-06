import { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { colorMap, Annotation as IAnnotation } from '../annotation'
import { useSetAction } from '../hooks'
import { BookTab, compareHref } from '../models'

// avoid click penetration
let clickedAnnotation = false

export const getClickedAnnotation = () => clickedAnnotation
export const setClickedAnnotation = (v: boolean) => (clickedAnnotation = v)

interface FindMatchProps {
  tab: BookTab
}
const FindMatches: React.FC<FindMatchProps> = ({ tab }) => {
  const setAction = useSetAction()
  const { rendition, results, currentHref } = useSnapshot(tab)

  useEffect(() => {
    const result = results?.find((r) => compareHref(currentHref, r.id))

    const matches = result?.subitems
    matches?.forEach((m) => {
      try {
        const h = rendition?.annotations.highlight(
          m.cfi!,
          undefined,
          undefined,
          undefined,
          {
            // tailwind yellow-500
            fill: 'rgba(234, 179, 8, 0.3)',
            'fill-opacity': 'unset',
          },
        )

        const g = h?.mark.element as SVGGElement
        g?.addEventListener('click', () => {
          setClickedAnnotation(true)
        })
      } catch (error) {
        // ignore matched text in `<title>`
      }
    })

    return () => {
      matches?.forEach((m) => {
        rendition?.annotations.remove(m.cfi!, 'highlight')
      })
    }
  }, [currentHref, rendition?.annotations, results, setAction])

  return null
}

interface DefinitionProps {
  tab: BookTab
  definition: string
}
const Definition: React.FC<DefinitionProps> = ({ tab, definition }) => {
  const setAction = useSetAction()
  const { rendition, currentHref } = useSnapshot(tab)

  useEffect(() => {
    const result = tab.searchInSection(definition)
    const matches = result?.subitems

    matches?.forEach((m) => {
      try {
        const h = rendition?.annotations.highlight(
          m.cfi!,
          undefined,
          undefined,
          undefined,
          {
            // tailwind gray-600
            fill: 'rgba(75, 85, 99, 0.15)',
            'fill-opacity': 'unset',
          },
        )

        const g = h?.mark.element as SVGGElement

        // `<rect>` should be reserved to response `click`
        g?.addEventListener('click', () => {
          tab.setAnnotationRange(m.cfi!)
          setClickedAnnotation(true)
        })
      } catch (error) {
        // ignore matched text in `<title>`
      }
    })

    return () => {
      matches?.forEach((m) =>
        rendition?.annotations.remove(m.cfi!, 'highlight'),
      )
    }
  }, [currentHref, definition, rendition?.annotations, setAction, tab])

  return null
}

interface AnnotationProps {
  tab: BookTab
  annotation: IAnnotation
}
const Annotation: React.FC<AnnotationProps> = ({ tab, annotation }) => {
  const { rendition } = useSnapshot(tab)

  useEffect(() => {
    if (!rendition?.annotations) return

    // Mobile produces three annotation types — `highlight`, `note`,
    // and `bookmark`. epub.js only knows `highlight` and `underline`.
    // We render notes as highlights (with a visual hint) and skip
    // bookmarks entirely (they show up in the chapters / bookmarks
    // panel, not as in-text overlays).
    const rawType = annotation.type as string
    if (rawType === 'bookmark') return
    const renderType: 'highlight' = 'highlight'

    const hasNote = !!(annotation.notes && annotation.notes.trim().length)
    const fill = colorMap[annotation.color] ?? colorMap.yellow

    // Style: a regular highlight uses just a coloured fill.
    // A highlight WITH a note also gets a dashed underline-ish
    // border so the reader can see at a glance "there's more here
    // than just a highlight".
    const styles: Record<string, string> = {
      fill,
      'fill-opacity': '0.5',
    }
    if (hasNote) {
      styles.stroke = 'currentColor'
      styles['stroke-width'] = '1'
      styles['stroke-dasharray'] = '3 2'
      styles['stroke-opacity'] = '0.55'
    }

    let mark: any
    try {
      mark = rendition.annotations.highlight(
        annotation.cfi,
        // data — epub.js stores this on the mark for us; we use it
        // later to decide whether to render the small note badge.
        { hasNote, notes: annotation.notes ?? '' },
        undefined,
        // className — the SVG <g> wrapping the highlight gets this
        // class. Useful for inspection / future styling.
        hasNote ? 'ls-has-note' : 'ls-no-note',
        styles,
      )
    } catch (err) {
      // Rendering can throw when the cfi targets a section that
      // hasn't been resolved yet (epub.js parse error). Swallow —
      // when the user navigates into the section, the effect will
      // re-run via the section/cfi dep and try again.
      console.warn('[Annotation] highlight failed:', err)
    }

    // Wire click manually on the SVG <g> — the epub.js `cb` parameter
    // is unreliable depending on the version, and the sibling
    // FindMatches / Definition components already use this pattern.
    const g = mark?.mark?.element as SVGGElement | undefined
    g?.addEventListener('click', () => {
      tab.setAnnotationRange(annotation.cfi)
      setClickedAnnotation(true)
    })

    // Drop a small badge into the SVG so the user sees a hint that
    // the highlight has a note attached. The badge ignores pointer
    // events so clicks on the <rect> still fire.
    if (g && hasNote) {
      try {
        const rect = g.querySelector('rect')
        if (rect) {
          const ns = 'http://www.w3.org/2000/svg'
          const r = parseFloat(rect.getAttribute('width') || '0')
          const x = parseFloat(rect.getAttribute('x') || '0')
          const y = parseFloat(rect.getAttribute('y') || '0')
          const badge = document.createElementNS(ns, 'circle')
          badge.setAttribute('cx', String(x + r - 4))
          badge.setAttribute('cy', String(y + 4))
          badge.setAttribute('r', '4')
          badge.setAttribute('fill', '#0EA5E9') // sky-500
          badge.setAttribute('stroke', 'white')
          badge.setAttribute('stroke-width', '1')
          badge.setAttribute('pointer-events', 'none')
          badge.setAttribute('data-ls-note-badge', '1')
          g.appendChild(badge)
        }
      } catch {
        // best-effort — if the SVG hasn't fully laid out yet, we
        // skip the badge rather than crashing the render.
      }
    }

    return () => {
      try {
        rendition.annotations.remove(annotation.cfi, renderType)
      } catch {
        // Ignore — annotation may already have been removed by a
        // section unload, or the cfi may not be in the current view.
      }
    }
  }, [
    annotation.cfi,
    annotation.color,
    annotation.type,
    annotation.notes,
    rendition?.annotations,
    tab,
  ])

  return null
}

interface AnnotationsProps {
  tab: BookTab
}
export const Annotations: React.FC<AnnotationsProps> = ({ tab }) => {
  const { book } = useSnapshot(tab)

  // We deliberately do NOT filter by `spine.index` any more.
  //
  // Mobile-created annotations don't track which spine section they
  // live in (the `BookAnnotation` model defaults `spineIndex: 0`),
  // so any filter on `spine.index === section.index` would hide
  // every mobile-made highlight unless the user happened to be on
  // section 0. epub.js's `rendition.annotations.highlight(cfi)` is
  // already designed to no-op when the target cfi isn't in the
  // currently-rendered view, so passing every annotation through
  // is safe — only the visible ones get painted.
  const annotations = Array.isArray(book.annotations) ? book.annotations : []
  const definitions = Array.isArray(book.definitions) ? book.definitions : []
  return (
    <>
      <FindMatches tab={tab} />
      {annotations.map((annotation) => (
        <Annotation key={annotation.id} tab={tab} annotation={annotation} />
      ))}
      {definitions.map((definition) => (
        <Definition key={definition} tab={tab} definition={definition} />
      ))}
    </>
  )
}
