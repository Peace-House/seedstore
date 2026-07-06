// Tab persistence across reloads / cross-page navigation.
//
// Why:
//   The `reader` valtio proxy lives in module memory and is wiped on
//   every full page load. Without persistence, refreshing the reader
//   page — or even closing the tab and reopening it later — loses
//   every open book tab. We persist a minimal serialisable snapshot
//   of the tab tree (group structure + book metadata per tab + focus
//   markers) into localStorage on every reader change, and restore
//   from that snapshot whenever the reader mounts with an empty
//   `reader.groups`.
//
// What we persist:
//   ONLY book tabs. PageTabs (Settings panel etc.) are session-scoped
//   chrome — the user expects "the books I had open" to come back, not
//   "the Settings panel I had open". We also persist enough book
//   metadata (id, name, cover, orderId, size, createdAt, metadata,
//   percentage, cfi) to recreate a usable BookTab without an extra
//   server round-trip. The actual EPUB binary stays in `db.files`
//   keyed by book id — restoration just looks it up.
//
// Restore strategy:
//   For each persisted tab id, look up `db.files.get(id)` for the
//   binary. If the file isn't cached (e.g. it was evicted), the tab
//   is silently skipped — the user can reopen it from the library and
//   it'll re-download. This is intentional: a tab whose binary we
//   can't restore would render a broken book pane, which is worse
//   than not restoring it.

import { subscribe } from 'valtio'

import { db } from '../db'
import { BookTab, reader } from '../models'

const STORAGE_KEY = 'reader_open_tabs_v1'

interface PersistedTab {
  id: string
  name?: string
  title?: string
  size?: number
  cover?: string | null
  coverImage?: string | null
  orderId?: number | string
  createdAt?: number | string
  updatedAt?: number | string
  metadata?: unknown
  cfi?: string
  percentage?: number
  definitions?: string[]
  annotations?: unknown[]
  configuration?: unknown
}

interface PersistedGroup {
  tabs: PersistedTab[]
  selectedIndex: number
}

interface PersistedState {
  groups: PersistedGroup[]
  focusedIndex: number
}

function safeGet(): PersistedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.groups)) return null
    return parsed as PersistedState
  } catch {
    return null
  }
}

function safeSet(state: PersistedState | null) {
  if (typeof window === 'undefined') return
  try {
    if (!state || state.groups.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded / storage disabled — silently skip; the in-memory
    // proxy is still authoritative for the current session.
  }
}

/**
 * Serialise the current reader state into the persistable shape.
 * Filters out PageTabs and any group that ends up with zero book tabs.
 */
function serializeReader(): PersistedState {
  const groups: PersistedGroup[] = []
  let focusedIndex = 0

  reader.groups.forEach((group, groupIdx) => {
    const persistedTabs: PersistedTab[] = []
    // Track where the original selectedIndex lands in the filtered
    // book-only list so the right tab stays selected after restore.
    let mappedSelected = -1

    group.tabs.forEach((tab, tabIdx) => {
      if (!(tab instanceof BookTab)) return
      const book = tab.book
      persistedTabs.push({
        id: String(book.id),
        name: book.name,
        title: (book as any).title,
        size: book.size,
        cover: book.cover ?? null,
        coverImage: book.coverImage ?? null,
        orderId: book.orderId,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        // metadata is a plain epubjs PackagingMetadataObject; safe to clone.
        metadata: book.metadata,
        cfi: book.cfi,
        percentage: book.percentage,
        definitions: book.definitions,
        annotations: book.annotations,
        configuration: book.configuration,
      })
      if (tabIdx === group.selectedIndex) {
        mappedSelected = persistedTabs.length - 1
      }
    })

    if (persistedTabs.length === 0) return

    // If the originally selected tab was a PageTab (now filtered out),
    // fall back to the last book tab in the group.
    const selectedIndex = mappedSelected >= 0 ? mappedSelected : persistedTabs.length - 1

    if (groupIdx === reader.focusedIndex) {
      focusedIndex = groups.length // index AFTER filtering
    }

    groups.push({ tabs: persistedTabs, selectedIndex })
  })

  focusedIndex = Math.min(focusedIndex, Math.max(0, groups.length - 1))

  return { groups, focusedIndex }
}

let started = false

/**
 * Subscribe to reader changes and persist. Idempotent — safe to call
 * multiple times (subsequent calls are no-ops).
 */
export function startTabPersistence() {
  if (started) return
  if (typeof window === 'undefined') return
  started = true

  // Debounce isn't strictly needed because localStorage is fast, but
  // valtio fires the subscription on every micro-update (selectedIndex,
  // percentage, etc.). A short trailing-only debounce smooths the
  // write rate during heavy reading sessions.
  let pending: number | null = null
  subscribe(reader, () => {
    if (pending !== null) return
    pending = window.setTimeout(() => {
      pending = null
      try {
        safeSet(serializeReader())
      } catch (err) {
        // serialisation failed — log but don't kill the reader.
        console.warn('[tabPersistence] serialize failed', err)
      }
    }, 100)
  })
}

/**
 * Restore book tabs from localStorage. Returns the number of tabs that
 * were successfully restored. No-op if the reader already has tabs
 * loaded (e.g. the URL `?bookId=...&orderId=...` flow won the race).
 */
export async function restorePersistedTabs(): Promise<number> {
  if (typeof window === 'undefined') return 0
  if (!db) return 0
  // If something already populated the reader (URL deep-link), don't
  // double-stack tabs on top of it.
  if (reader.groups.length > 0) return 0

  const state = safeGet()
  if (!state || state.groups.length === 0) return 0

  let restored = 0

  for (let groupIdx = 0; groupIdx < state.groups.length; groupIdx++) {
    const persistedGroup = state.groups[groupIdx]
    if (!persistedGroup || persistedGroup.tabs.length === 0) continue

    // For groups past the first, force a new reader group so the
    // group structure survives. Without this every restored tab would
    // collapse into a single group.
    if (groupIdx > 0) {
      reader.addGroup([])
    }

    for (const persistedTab of persistedGroup.tabs) {
      try {
        const fileRecord = await db.files.get(persistedTab.id)
        if (!fileRecord?.file) {
          // Binary isn't cached — skip silently. The user can reopen
          // from the library to re-download.
          continue
        }
        // Build a BookRecord-compatible payload. Cast metadata back to
        // its expected shape; we kept it as a plain object on save.
        const book: any = {
          id: persistedTab.id,
          name: persistedTab.name ?? persistedTab.title ?? persistedTab.id,
          title: persistedTab.title,
          size: persistedTab.size ?? fileRecord.file.size ?? 0,
          metadata: persistedTab.metadata ?? {},
          createdAt: persistedTab.createdAt ?? Date.now(),
          updatedAt: persistedTab.updatedAt,
          cover: persistedTab.cover ?? null,
          coverImage: persistedTab.coverImage ?? null,
          orderId: persistedTab.orderId,
          cfi: persistedTab.cfi,
          percentage: persistedTab.percentage,
          definitions: persistedTab.definitions ?? [],
          annotations: persistedTab.annotations ?? [],
          configuration: persistedTab.configuration ?? { typography: undefined },
          file: fileRecord.file,
        }
        reader.addTab(book)
        restored++
      } catch (err) {
        console.warn(
          '[tabPersistence] failed to restore tab',
          persistedTab.id,
          err,
        )
      }
    }

    // Restore selected tab within this group.
    const restoredGroup = reader.groups[groupIdx]
    if (
      restoredGroup &&
      persistedGroup.selectedIndex >= 0 &&
      persistedGroup.selectedIndex < restoredGroup.tabs.length
    ) {
      restoredGroup.selectedIndex = persistedGroup.selectedIndex
    }
  }

  // Restore focused group. Clamp to valid range — groups whose only
  // tabs were uncached files would have been skipped, shifting the
  // index.
  if (reader.groups.length > 0) {
    reader.focusedIndex = Math.min(
      state.focusedIndex,
      reader.groups.length - 1,
    )
  }

  return restored
}
