import { db } from '../db'

import { remoteToLocal } from './annotationService'
import { eventStream } from './eventStreamService'

/**
 * Bridges incoming SSE events from the server into the reader's local
 * Dexie store. The reader UI consumes Dexie via Recoil/Valtio hooks, so
 * once we update the relevant book record the annotation overlays and
 * progress slider refresh on their own.
 *
 * Three transitions to handle:
 *   - annotation.upserted   → insert-or-update inside book.annotations
 *   - annotation.deleted    → drop the row from book.annotations
 *   - progress.updated      → write book.cfi + book.percentage
 *
 * The book.id in Dexie is a string; the server sends bookId as a number.
 * We coerce in both directions.
 */

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
          return
        }
        case 'annotation.deleted': {
          const bookId = String(event.payload.bookId)
          const cfi = event.payload.cfi
          const book = await db.books.get(bookId)
          if (!book) return
          const next = (book.annotations ?? []).filter((a) => a.cfi !== cfi)
          await db.books.update(bookId, { annotations: next })
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
          await db.books.update(bookId, {
            cfi: event.payload.cfi || undefined,
            percentage: monotonic,
          })
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
