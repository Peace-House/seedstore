import { remoteToLocal, RemoteAnnotation } from './annotationService'
import { getClientId } from './clientId'
import { ReadProgress } from './readProgressService'

/**
 * Web Server-Sent Events client.
 *
 * The browser's native `EventSource` API doesn't support custom headers
 * (notably `Authorization: Bearer ...`), so we use `fetch` + a
 * `ReadableStream` reader and parse the event-stream format manually.
 * This mirrors what the mobile client does and lets us reuse the same
 * server endpoint without query-string tokens.
 *
 * Connection rules:
 *   - Connect when an auth token is present and the document is visible.
 *   - Disconnect on logout / tab hidden.
 *   - Reconnect with capped exponential backoff (1, 2, 4, 8, 16, 30s).
 */

type AnnotationUpserted = { type: 'annotation.upserted'; payload: RemoteAnnotation; originClientId?: string }
type AnnotationDeleted = {
  type: 'annotation.deleted'
  payload: { id?: string; bookId: number; cfi: string }
  originClientId?: string
}
type ProgressUpdated = { type: 'progress.updated'; payload: ReadProgress; originClientId?: string }
type ProgressDeleted = {
  type: 'progress.deleted'
  payload: { bookId: number }
  originClientId?: string
}
type Connected = { type: 'connected'; payload: { ok: boolean; ts: number } }
type SessionExpired = { type: 'session.expired'; payload: { reason: string } }

export type ServerEvent =
  | AnnotationUpserted
  | AnnotationDeleted
  | ProgressUpdated
  | ProgressDeleted
  | Connected
  | SessionExpired

export type EventListener = (event: ServerEvent) => void

class EventStreamServiceImpl {
  private controller: AbortController | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private attempt = 0
  private started = false
  private listeners = new Set<EventListener>()

  /** Subscribe a callback that fires on every parsed event. Returns an
   *  unsubscribe function. Reader components subscribe to this to keep
   *  their in-memory state in sync without re-fetching. */
  on(listener: EventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Wire up visibility listening and try the first connect. */
  start() {
    if (this.started) return
    this.started = true
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange)
    }
    void this.connect()
  }

  stop() {
    this.started = false
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.disconnect()
  }

  /** Drop any pending backoff / in-flight connection and reconnect now.
   *  Call after a fresh login or token refresh — without this, the
   *  service may sit on a backoff retry of up to 30s before noticing
   *  the new token. */
  reconnect() {
    if (!this.started) {
      this.start()
      return
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.attempt = 0
    this.disconnect()
    void this.connect()
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      if (!this.controller) void this.connect()
    } else {
      // Tab hidden — drop the connection. Browsers and mobile OSes alike
      // throttle hidden-tab work; the connection would just sit idle.
      this.disconnect()
    }
  }

  // ── Connection ─────────────────────────────────────────────────────────

  private async connect() {
    if (this.controller) return
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('auth_token')
    if (!token) {
      this.scheduleRetry('no auth token')
      return
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
    if (!apiBase) {
      console.warn('[Events] NEXT_PUBLIC_API_BASE_URL not set; SSE disabled')
      return
    }

    const clientId = getClientId()
    const url = `${apiBase}/events?clientId=${encodeURIComponent(clientId)}`
    const ac = new AbortController()
    this.controller = ac

    console.debug(`[Events] Connecting (clientId=${clientId})`)

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: ac.signal,
      })
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      this.attempt = 0 // success — reset backoff
      console.debug('[Events] Connected, listening for frames')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Pump loop. We exit either on stream end (server closed) or on
      // abort (us closing).
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // Frames are delimited by a blank line.
        let delim = buffer.indexOf('\n\n')
        while (delim !== -1) {
          const frame = buffer.slice(0, delim)
          buffer = buffer.slice(delim + 2)
          this.handleFrame(frame)
          delim = buffer.indexOf('\n\n')
        }
      }
    } catch (e: any) {
      if (ac.signal.aborted) return // intentional close
      console.warn('[Events] Stream error:', e?.message || e)
    } finally {
      // Only clear the active controller if it's still ours. A
      // start→stop→start cycle (dev StrictMode, hot reload, page nav)
      // means a *newer* `connect()` has already overwritten this.controller
      // with its own AbortController; clearing it here would orphan the
      // new connection and leave the service silently dead.
      if (this.controller === ac) {
        this.controller = null
        if (this.started) this.scheduleRetry('disconnected')
      }
    }
  }

  private disconnect() {
    if (this.controller) {
      this.controller.abort()
      this.controller = null
    }
  }

  private scheduleRetry(reason: string) {
    if (!this.started) return
    if (this.retryTimer) return
    const secs = Math.min(30, 1 << Math.min(this.attempt, 5))
    this.attempt = Math.min(this.attempt + 1, 5)
    console.debug(`[Events] Reconnect in ${secs}s (${reason})`)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      void this.connect()
    }, secs * 1000)
  }

  // ── Parsing ────────────────────────────────────────────────────────────

  private handleFrame(frame: string) {
    let eventName: string | undefined
    const dataLines: string[] = []
    for (const raw of frame.split('\n')) {
      const line = raw.trimEnd()
      if (!line || line.startsWith(':')) continue
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }
    if (dataLines.length === 0) return
    let parsed: any
    try {
      parsed = JSON.parse(dataLines.join('\n'))
    } catch (e) {
      console.warn('[Events] Frame parse error:', e)
      return
    }
    const type = (eventName || parsed.type) as ServerEvent['type'] | undefined
    if (!type) return
    // The annotation/progress controllers wrap their payloads in an
    // envelope `{type, originClientId, payload}`. The `connected` and
    // `session.expired` events from the events controller don't — they
    // write the data fields at the top level. Fall back to `parsed`
    // itself when there's no `payload` so handlers always receive a
    // non-null object.
    const payload = parsed && typeof parsed === 'object' && 'payload' in parsed ? parsed.payload : parsed
    const event = { type, payload, originClientId: parsed?.originClientId } as ServerEvent
    console.debug('[Events] Received', type)
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (e) {
        console.warn('[Events] Listener threw:', e)
      }
    }
  }
}

export const eventStream = new EventStreamServiceImpl()

/** Helper for components: subscribe and convert the server's
 *  `RemoteAnnotation` to the reader's local `Annotation` shape. Returns
 *  the unsubscribe. */
export function subscribeAnnotationEvents(
  onUpsert: (a: ReturnType<typeof remoteToLocal>) => void,
  onDelete: (e: { bookId: number; cfi: string }) => void,
): () => void {
  return eventStream.on((event) => {
    if (event.type === 'annotation.upserted') {
      onUpsert(remoteToLocal(event.payload))
    } else if (event.type === 'annotation.deleted') {
      onDelete({ bookId: event.payload.bookId, cfi: event.payload.cfi })
    }
  })
}

/** Helper for components: subscribe to progress updates only. */
export function subscribeProgressEvents(onUpdate: (p: ReadProgress) => void): () => void {
  return eventStream.on((event) => {
    if (event.type === 'progress.updated') onUpdate(event.payload)
  })
}
