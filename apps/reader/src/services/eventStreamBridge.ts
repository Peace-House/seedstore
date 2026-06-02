import { db } from '../db'
import { reader } from '../models'

import { remoteToLocal } from './annotationService'
import { eventStream } from './eventStreamService'

/**
 * Bridges incoming SSE events from the server into the reader's local
 * state.
 *
 * The reader UI consumes annotations and progress through Valtio
 * (`useSnapshot(reader)`), NOT directly from Dexie. So an SSE update
 * has to land in two places to be visible in real time:
 *
 *   1. Dexie (`db.books.update(...)`) — survives reload, populates the
 *      library list, and is the source of truth on the next mount.
 *   2. Valtio (`reader.focusedBookTab.book = {...}`) — re-renders the
 *      currently-open book tab right now without waiting for a manual
 *      re-fetch. Updating only Dexie was a sync gap that made
 *      mobile-to-web mirror feel broken even though the data was on
 *      disk.
 *
 * Transitions handled:
 *   - annotation.upserted   → insert-or-update inside book.annotations
 *   - annotation.deleted    → drop the row from book.annotations
 *   - progress.updated      → write book.cfi + book.percentage
 *
 * The book.id in Dexie is a string; the server sends bookId as a number.
 * We coerce in both directions.
 */

/** Push an annotation list into the Valtio tab if it's the focused book. */
function applyAnnotationsToValtio(bookId: string, annotations: unknown[]) {
  const tab = reader.focusedBookTab
  if (tab && tab.book.id === bookId) {
    tab.book = { ...tab.book, annotations: annotations as any }
  }
}

/** Push progress fields into the Valtio tab if it's the focused book. */
function applyProgressToValtio(
  bookId: string,
  cfi: string | undefined,
  percentage: number,
) {
  const tab = reader.focusedBookTab
  if (tab && tab.book.id === bookId) {
    tab.book = { ...tab.book, cfi, percentage }
  }
}

let unsubscribe: (() => void) | null = null

export function startEventStreamBridge() {
  if (unsubscribe || !db) return

  unsubscribe = eventStream.on(async (event) => {
    if (!db) return
    try {
      switch (event.type) {
        case 'annotation.upserted': {
          const incoming = remoteToLocal(event.payload)
          const bookId = String(event.payload.bookId)
          const book = await db.books.get(bookId)
          if (!book) return
          const next = (book.annotations ?? []).filter((a) => a.cfi !== incoming.cfi)
          next.push(incoming)
          await db.books.update(bookId, { annotations: next })
          // Mirror into Valtio so the open reader tab repaints right
          // away — without this, the highlight only appears after the
          // user reloads.
          applyAnnotationsToValtio(bookId, next)
          return
        }
        case 'annotation.deleted': {
          const bookId = String(event.payload.bookId)
          const cfi = event.payload.cfi
          const book = await db.books.get(bookId)
          if (!book) return
          const next = (book.annotations ?? []).filter((a) => a.cfi !== cfi)
          await db.books.update(bookId, { annotations: next })
          applyAnnotationsToValtio(bookId, next)
          return
        }
        case 'progress.updated': {
          const bookId = String(event.payload.bookId)
          const book = await db.books.get(bookId)
          if (!book) return
          // Percentage on the server is 0-100; the reader's denormalised
          // percentage is stored as a 0-1 fraction (per the existing
          // codebase's convention). Convert here so the UI renders
          // correctly. Apply the same monotonic rule as
          // saveLocalProgress so an out-of-order event from another
          // device can't cause this tab's progress to step backwards.
          const incoming = (event.payload.percentage || 0) / 100
          const existing = typeof book.percentage === 'number' ? book.percentage : 0
          const monotonic = incoming > existing ? incoming : existing
          const incomingCfi = event.payload.cfi || undefined
          await db.books.update(bookId, {
            cfi: incomingCfi,
            percentage: monotonic,
          })
          // Mirror to Valtio so the open tab's progress slider and any
          // library overlay derived from `book.percentage` repaint live.
          applyProgressToValtio(bookId, incomingCfi, monotonic)
          return
        }
        case 'session.expired': {
          // Server says the session is gone. Don't redirect from a
          // single event — that's too disruptive if the event misfires,
          // and the existing 401 interceptor on the next API call
          // already handles logout cleanly. Just stop the SSE service so
          // we don't reconnect into an immediate close loop.
          const reason = (event.payload as { reason?: string } | undefined)?.reason
          console.info('[EventBridge] Session expired:', reason ?? 'unknown')
          eventStream.stop()
          return
        }
        case 'progress.deleted':
        case 'connected':
        default:
          return
      }
    } catch (e) {
      console.warn('[EventBridge] Apply error:', e)
    }
  })
}

export function stopEventStreamBridge() {
  unsubscribe?.()
  unsubscribe = null
}
