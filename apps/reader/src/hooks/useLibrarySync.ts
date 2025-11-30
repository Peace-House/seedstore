import { useEffect, useRef } from 'react'

import { BookRecord } from '../db'
import {
  syncLocalLibraryWithRemote,
  isAuthenticated,
} from '../services/librarySyncService'

/**
 * Hook to sync local library with remote library
 * Removes books from local DB that are no longer in the user's remote library
 *
 * @param remoteBooks - Array of books from the remote library
 */
export function useLibrarySync(remoteBooks: BookRecord[] | null | undefined) {
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    // Only sync once per mount and when we have remote books
    if (hasSyncedRef.current || !remoteBooks || !isAuthenticated()) return

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
