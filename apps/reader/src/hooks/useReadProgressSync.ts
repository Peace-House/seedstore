import { useCallback, useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { reader } from '../models'
import {
  getReadProgress,
  updateReadProgress,
  isAuthenticated,
} from '../services/readProgressService'

// Debounce time for syncing progress (ms)
const SYNC_DEBOUNCE = 2000

/**
 * Hook to sync reading progress between local state and remote server
 * - On mount: fetches remote progress and restores position
 * - On location change: debounced sync to server
 */
export function useReadProgressSync(bookId: string | undefined) {
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<{ cfi: string | null; percentage: number }>({
    cfi: null,
    percentage: 0,
  })
  const isSyncingRef = useRef(false)
  const hasRestoredRef = useRef(false)

  // Get the focused book tab
  const { focusedBookTab } = useSnapshot(reader)

  // Calculate current progress percentage
  const calculatePercentage = useCallback((): number => {
    const tab = reader.focusedBookTab
    if (!tab?.rendition?.location) return 0

    const location = tab.rendition.location
    // epub.js provides start.percentage
    if (location.start?.percentage !== undefined) {
      return Math.round(location.start.percentage * 100)
    }

    // Fallback: calculate from displayed pages
    if (tab.sections && tab.section) {
      const currentIndex = tab.sections.findIndex(
        (s) => s.href === tab.section?.href
      )
      if (currentIndex >= 0 && tab.sections.length > 0) {
        return Math.round((currentIndex / tab.sections.length) * 100)
      }
    }

    return 0
  }, [])

  // Get current CFI from epub location
  const getCurrentCfi = useCallback((): string | null => {
    const tab = reader.focusedBookTab
    if (!tab?.rendition?.location?.start?.cfi) return null
    return tab.rendition.location.start.cfi
  }, [])

  // Restore reading position from server
  const restorePosition = useCallback(async () => {
    if (!bookId || !isAuthenticated() || hasRestoredRef.current) return

    const numericBookId = parseInt(bookId, 10)
    if (isNaN(numericBookId)) return

    try {
      const progress = await getReadProgress(numericBookId)

      if (progress.cfi) {
        // Wait for rendition to be ready
        const tab = reader.focusedBookTab
        if (tab?.rendition) {
          // Small delay to ensure rendition is fully initialized
          setTimeout(() => {
            try {
              tab.display(progress.cfi!, false) // false = don't show return button
              console.log(
                `[ReadProgressSync] Restored position for book ${bookId} to ${progress.percentage}%`
              )
            } catch (err) {
              console.error('[ReadProgressSync] Error restoring position:', err)
            }
          }, 500)
        }
      }

      hasRestoredRef.current = true
      lastSyncRef.current = {
        cfi: progress.cfi,
        percentage: progress.percentage,
      }
    } catch (error) {
      console.error('[ReadProgressSync] Error fetching progress:', error)
      hasRestoredRef.current = true // Don't retry on error
    }
  }, [bookId])

  // Sync current position to server
  const syncToServer = useCallback(async () => {
    if (!bookId || !isAuthenticated() || isSyncingRef.current) return

    const numericBookId = parseInt(bookId, 10)
    if (isNaN(numericBookId)) return

    const cfi = getCurrentCfi()
    const percentage = calculatePercentage()

    // Skip if nothing changed
    if (
      cfi === lastSyncRef.current.cfi &&
      percentage === lastSyncRef.current.percentage
    ) {
      return
    }

    isSyncingRef.current = true

    try {
      await updateReadProgress(numericBookId, cfi, percentage)
      lastSyncRef.current = { cfi, percentage }
      console.log(
        `[ReadProgressSync] Synced progress for book ${bookId}: ${percentage}%`
      )
    } catch (error) {
      console.error('[ReadProgressSync] Error syncing progress:', error)
    } finally {
      isSyncingRef.current = false
    }
  }, [bookId, calculatePercentage, getCurrentCfi])

  // Debounced sync function
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    syncTimeoutRef.current = setTimeout(syncToServer, SYNC_DEBOUNCE)
  }, [syncToServer])

  // Restore position when book is opened
  useEffect(() => {
    if (bookId && focusedBookTab?.rendered) {
      restorePosition()
    }
  }, [bookId, focusedBookTab?.rendered, restorePosition])

  // Track location changes
  useEffect(() => {
    const tab = reader.focusedBookTab
    if (!tab?.rendition || !bookId) return

    const handleRelocated = () => {
      debouncedSync()
    }

    // Subscribe to location changes
    tab.rendition.on('relocated', handleRelocated)

    return () => {
      tab.rendition?.off('relocated', handleRelocated)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [bookId, focusedBookTab?.rendition, debouncedSync])

  // Reset restored flag when book changes
  useEffect(() => {
    hasRestoredRef.current = false
  }, [bookId])

  // Sync on unmount (when leaving the book)
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      // Final sync when leaving
      syncToServer()
    }
  }, [syncToServer])

  return {
    syncToServer,
    calculatePercentage,
    getCurrentCfi,
  }
}
