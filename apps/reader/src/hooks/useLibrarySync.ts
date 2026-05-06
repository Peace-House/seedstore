import { useEffect, useRef } from 'react'

import { BookRecord } from '../db'
import {
  syncLocalLibraryWithRemote,
  isAuthenticated,
} from '../services/librarySyncService'

/**
 * Hook to sync local library with remote library.
 *
 * Removes books from local DB that are no longer in the user's remote
 * library. The sync runs at most once per mount and ONLY after we've
 * confirmed the remote has at least one book — passing through an
 * empty array would otherwise wipe the entire IndexedDB cache (books,
 * files, covers) on every reader page load while SWR is still in its
 * loading state, and race against the book-opening flow that has
 * just put the freshly-downloaded EPUB in `db.files`.
 *
 * @param remoteBooks - Array of books from the remote library
 */
export function useLibrarySync(remoteBooks: BookRecord[] | null | undefined) {
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    if (hasSyncedRef.current) return
    if (!isAuthenticated()) return
    // remoteBooks can be:
    //   - undefined / null while SWR is fetching
    //   - [] while SWR has fallback data but no real response yet
    //   - [] after a real response when the user genuinely owns no
    //     books (very rare for an authenticated user reaching this
    //     screen, since the entry-point is library → click a book)
    // The first two states must not trigger a purge. We treat "0
    // books" as also-skip — the worst outcome is that someone who
    // unsubscribes from every book ever sees stale local data, which
    // is far better than nuking the cache mid-download.
    if (!remoteBooks || remoteBooks.length === 0) return

    // Sync local library with remote
    syncLocalLibraryWithRemote(remoteBooks)
      .then(() => {
        hasSyncedRef.current = true
        console.log('[useLibrarySync] Library sync completed')
      })
      .catch((error) => {
        console.error('[useLibrarySync] Library sync failed:', error)
      })
  }, [remoteBooks])
}
