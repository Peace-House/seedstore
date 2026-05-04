/**
 * A stable per-browser identifier used by the SSE hub on the server to
 * skip echoing this tab's writes back to itself, and by every write
 * request (`X-Client-Id` header) so the server knows who originated it.
 *
 * Survives page reloads but is per-browser-profile — different browsers
 * or incognito sessions get different ids, which is the correct
 * granularity for SSE filtering.
 */

const STORAGE_KEY = 'sse_client_id_v1'

let cached: string | null = null

function generateId(): string {
  // crypto.randomUUID is supported by every browser this app targets;
  // fall back to a manual v4 generator for older webviews.
  const c = (typeof crypto !== 'undefined' ? crypto : null) as Crypto | null
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  // RFC4122 v4 fallback. Non-null assertions on bytes[i] are safe here
  // because we just allocated a 16-byte Uint8Array — every index is
  // populated. tsconfig uses noUncheckedIndexedAccess which otherwise
  // types element access as `T | undefined`.
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

export function getClientId(): string {
  if (cached) return cached
  if (typeof window === 'undefined') {
    // SSR safeguard — should never be hit on the reader.
    return 'ssr-stub'
  }
  let id = window.localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = generateId()
    window.localStorage.setItem(STORAGE_KEY, id)
  }
  cached = id
  return id
}
