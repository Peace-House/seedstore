import { useCallback, useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { Annotation } from '../annotation'
import { db } from '../db'
import { reader } from '../models'
import {
  fetchAnnotations,
  syncAnnotationsToServer,
  isAuthenticated,
} from '../services/annotationService'

// Debounce time for syncing annotations (ms)
const SYNC_DEBOUNCE = 3000

/**
 * Hook to sync annotations between local IndexedDB and remote server
 * - On mount: fetches remote annotations and merges with local
 * - On annotation change: debounced sync to server
 */
export function useAnnotationSync(bookId: string | undefined) {
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<number>(0)
  const isSyncingRef = useRef(false)

  // Get the focused book tab
  const { focusedBookTab } = useSnapshot(reader)
  const book = focusedBookTab?.book

  // Fetch remote annotations and merge with local on mount
  const fetchAndMerge = useCallback(async () => {
    if (!bookId || !isAuthenticated()) return

    const numericBookId = parseInt(bookId, 10)
    if (isNaN(numericBookId)) return

    try {
      const remoteAnnotations = await fetchAnnotations(numericBookId)

      if (!remoteAnnotations.length) return

      // Get current local annotations
      const localBook = await db?.books.get(bookId)
      const localAnnotations = localBook?.annotations || []

      // Create a map of local annotations by CFI for quick lookup
      const localMap = new Map(localAnnotations.map((a) => [a.cfi, a]))

      // Merge strategy: remote wins if updatedAt is newer
      const merged: Annotation[] = []
      const remoteCfis = new Set<string>()

      for (const remote of remoteAnnotations) {
        remoteCfis.add(remote.cfi)
        const local = localMap.get(remote.cfi)

        if (!local) {
          // New from remote
          merged.push(remote)
        } else if (remote.updatedAt > local.updatedAt) {
          // Remote is newer
          merged.push(remote)
        } else {
          // Local is newer or same
          merged.push(local)
        }
      }

      // Add local-only annotations (not on server yet)
      for (const local of localAnnotations) {
        if (!remoteCfis.has(local.cfi)) {
          merged.push(local)
        }
      }

      // Update local database
      await db?.books.update(bookId, { annotations: merged })

      // Also update valtio state if the book is currently open
      if (reader.focusedBookTab?.book.id === bookId) {
        reader.focusedBookTab.book = {
          ...reader.focusedBookTab.book,
          annotations: merged,
        }
      }

      console.log(`[AnnotationSync] Merged ${merged.length} annotations for book ${bookId}`)
    } catch (error) {
      console.error('[AnnotationSync] Error fetching/merging:', error)
    }
  }, [bookId])

  // Sync local annotations to server
  const syncToServer = useCallback(async () => {
    if (!bookId || !isAuthenticated() || isSyncingRef.current) return

    const numericBookId = parseInt(bookId, 10)
    if (isNaN(numericBookId)) return

    isSyncingRef.current = true

    try {
      // Get current local annotations
      const localBook = await db?.books.get(bookId)
      const localAnnotations = localBook?.annotations || []

      if (localAnnotations.length === 0) {
        isSyncingRef.current = false
        return
      }

      const result = await syncAnnotationsToServer(numericBookId, localAnnotations)

      if (result.success) {
        lastSyncRef.current = Date.now()
        console.log(`[AnnotationSync] Synced ${localAnnotations.length} annotations to server`)
      }
    } catch (error) {
      console.error('[AnnotationSync] Error syncing to server:', error)
    } finally {
      isSyncingRef.current = false
    }
  }, [bookId])

  // Debounced sync trigger
  const triggerSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToServer()
    }, SYNC_DEBOUNCE)
  }, [syncToServer])

  // Fetch and merge on mount
  useEffect(() => {
    if (bookId && isAuthenticated()) {
      fetchAndMerge()
    }
  }, [bookId, fetchAndMerge])

  // Watch for annotation changes and trigger sync
  useEffect(() => {
    if (!book?.annotations || !isAuthenticated()) return

    // Trigger sync when annotations change
    triggerSync()
  }, [book?.annotations, triggerSync])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      // Final sync on unmount
      if (isAuthenticated()) {
        syncToServer()
      }
    }
  }, [syncToServer])

  return {
    syncNow: syncToServer,
    fetchAndMerge,
  }
}
