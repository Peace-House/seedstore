import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { reader } from '../models'
import {
  addToSyncQueue,
  getLocalProgress,
  getSyncQueue,
  isOnline,
  removeFromSyncQueue,
  saveLocalProgress,
} from '../services/localProgressService'
import {
  getReadProgress,
  isAuthenticated,
  updateReadProgress,
} from '../services/readProgressService'

// Debounce time for syncing progress (ms)
const SYNC_DEBOUNCE = 2000
// Debounce for local saves (faster than server sync)
const LOCAL_SAVE_DEBOUNCE = 500

/**
 * Hook to sync reading progress with offline-first approach:
 * 1. Always save to local IndexedDB immediately
 * 2. Sync to server when online (debounced)
 * 3. Queue changes when offline, sync when back online
 * 4. On mount: try local first, then fetch from server if online
 * 5. Only update if new percentage is higher than saved (prevents progress loss when going back)
 */
export function useReadProgressSync(bookId: string | undefined) {
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<{ cfi: string | null; percentage: number }>({
    cfi: null,
    percentage: 0,
  })
  const isSyncingRef = useRef(false)
  const hasRestoredRef = useRef(false)
  // Track the maximum percentage reached to prevent saving lower progress
  const maxPercentageRef = useRef(0)
  // Track if we're currently restoring the reading position
  const [isRestoring, setIsRestoring] = useState(false)
  // Track if there's saved progress to restore
  const hasSavedProgressRef = useRef<boolean | null>(null)

  // Get the focused book tab
  const { focusedBookTab } = useSnapshot(reader)

  // Get current progress percentage from the book record (already calculated by reader.ts)
  // The percentage in book is stored as decimal (0-1), we convert to 0-100 for server
  const calculatePercentage = useCallback((): number => {
    const tab = reader.focusedBookTab
    
    // Debug: log what we have access to
    console.log('[ReadProgressSync] calculatePercentage called:', {
      hasTab: !!tab,
      hasBook: !!tab?.book,
      bookPercentage: tab?.book?.percentage,
      bookCfi: tab?.book?.cfi,
    })
    
    if (!tab?.book?.percentage) return 0
    
    // book.percentage is stored as 0-1 decimal, convert to 0-100
    const percentage = Math.round(tab.book.percentage * 100)
    console.log(`[ReadProgressSync] Calculated percentage: ${tab.book.percentage} -> ${percentage}%`)
    return percentage
  }, [])

  // Get current CFI from the book record (already saved by reader.ts)
  const getCurrentCfi = useCallback((): string | null => {
    const tab = reader.focusedBookTab
    if (!tab?.book?.cfi) return null
    return tab.book.cfi
  }, [])

  // Save to local IndexedDB (fast, offline-capable)
  // Only saves if percentage is higher than previously saved (prevents progress loss)
  const saveLocally = useCallback(async () => {
    if (!bookId) return

    const cfi = getCurrentCfi()
    const percentage = calculatePercentage()

    // Skip if nothing changed
    if (
      cfi === lastSyncRef.current.cfi &&
      percentage === lastSyncRef.current.percentage
    ) {
      return
    }

    // Only save if percentage is higher than max reached
    // This prevents progress loss when navigating backwards
    if (percentage < maxPercentageRef.current) {
      console.log(`[ReadProgressSync] Skipping save - current ${percentage}% < max ${maxPercentageRef.current}%`)
      return
    }

    const saved = await saveLocalProgress(bookId, cfi, percentage)
    if (saved) {
      lastSyncRef.current = { cfi, percentage }
      maxPercentageRef.current = Math.max(maxPercentageRef.current, percentage)
      console.log(`[ReadProgressSync] Saved locally: book ${bookId} at ${percentage}%`)
    }
  }, [bookId, calculatePercentage, getCurrentCfi])

  // Sync current position to server
  // Only syncs if percentage is higher than max reached (prevents progress loss)
  const syncToServer = useCallback(async () => {
    if (!bookId || !isAuthenticated() || isSyncingRef.current) return

    const cfi = getCurrentCfi()
    const percentage = calculatePercentage()

    // Only sync if percentage is higher than max reached
    if (percentage < maxPercentageRef.current) {
      console.log(`[ReadProgressSync] Skipping server sync - current ${percentage}% < max ${maxPercentageRef.current}%`)
      return
    }

    // If offline, add to queue and return
    if (!isOnline()) {
      addToSyncQueue({ bookId, cfi, percentage })
      console.log(`[ReadProgressSync] Offline - queued for later: book ${bookId}`)
      return
    }

    const numericBookId = parseInt(bookId, 10)
    if (isNaN(numericBookId)) return

    isSyncingRef.current = true

    try {
      await updateReadProgress(numericBookId, cfi, percentage)
      maxPercentageRef.current = Math.max(maxPercentageRef.current, percentage)
      console.log(
        `[ReadProgressSync] Synced to server: book ${bookId} at ${percentage}%`
      )
    } catch (error) {
      // Failed to sync - add to queue for later
      addToSyncQueue({ bookId, cfi, percentage })
      console.error('[ReadProgressSync] Error syncing to server, queued:', error)
    } finally {
      isSyncingRef.current = false
    }
  }, [bookId, calculatePercentage, getCurrentCfi])

  // Check if there's saved progress before rendering (called early)
  const checkForSavedProgress = useCallback(async () => {
    if (!bookId) {
      hasSavedProgressRef.current = false
      return false
    }

    const numericBookId = parseInt(bookId, 10)
    if (isNaN(numericBookId)) {
      hasSavedProgressRef.current = false
      return false
    }

    // Check local first
    const localProgress = await getLocalProgress(bookId)
    if (localProgress?.cfi && localProgress.percentage > 0) {
      hasSavedProgressRef.current = true
      setIsRestoring(true)
      return true
    }

    // Check server if online
    if (isOnline() && isAuthenticated()) {
      try {
        const serverProgress = await getReadProgress(numericBookId)
        if (serverProgress?.cfi && serverProgress.percentage > 0) {
          hasSavedProgressRef.current = true
          setIsRestoring(true)
          return true
        }
      } catch {
        // Ignore errors, assume no saved progress
      }
    }

    hasSavedProgressRef.current = false
    return false
  }, [bookId])

  // Restore reading position - try local first, then server
  const restorePosition = useCallback(async () => {
    console.log(`[ReadProgressSync] restorePosition called:`, { bookId, hasRestored: hasRestoredRef.current })
    
    if (!bookId || hasRestoredRef.current) {
      console.log(`[ReadProgressSync] Skipping restore - bookId: ${bookId}, hasRestored: ${hasRestoredRef.current}`)
      setIsRestoring(false)
      return
    }

    const numericBookId = parseInt(bookId, 10)
    if (isNaN(numericBookId)) {
      console.log(`[ReadProgressSync] Invalid bookId (not a number): ${bookId}`)
      setIsRestoring(false)
      return
    }

    console.log(`[ReadProgressSync] Attempting to restore position for book ${bookId} (numeric: ${numericBookId})`)

    try {
      // First, try to get from local IndexedDB (fast, offline-capable)
      const localProgress = await getLocalProgress(bookId)
      console.log(`[ReadProgressSync] Local progress:`, localProgress)
      
      let progressToRestore: { cfi: string | null; percentage: number } | null = null

      if (localProgress && localProgress.cfi) {
        progressToRestore = localProgress
        console.log(`[ReadProgressSync] Found local progress: ${localProgress.percentage}%, cfi: ${localProgress.cfi}`)
      }

      // If online and authenticated, try to get server progress too
      if (isOnline() && isAuthenticated()) {
        try {
          const serverProgress = await getReadProgress(numericBookId)
          console.log(`[ReadProgressSync] Server progress:`, serverProgress)
          
          // Use server progress if it's more recent or if no local progress
          if (serverProgress.cfi) {
            const serverTime = serverProgress.lastReadAt 
              ? new Date(serverProgress.lastReadAt).getTime() 
              : 0
            const localTime = localProgress?.lastReadAt || 0

            console.log(`[ReadProgressSync] Server time: ${serverTime}, Local time: ${localTime}`)

            if (!progressToRestore || serverTime > localTime) {
              progressToRestore = serverProgress
              console.log(`[ReadProgressSync] Using server progress: ${serverProgress.percentage}%, cfi: ${serverProgress.cfi}`)
              
              // Update local DB with server data (convert percentage 0-100 to 0-1 for storage)
              await saveLocalProgress(bookId, serverProgress.cfi, serverProgress.percentage)
            }
          }
        } catch (err) {
          console.log('[ReadProgressSync] Could not fetch server progress, using local:', err)
        }
      }

      // Restore position if we have one
      if (progressToRestore?.cfi) {
        const tab = reader.focusedBookTab
        console.log(`[ReadProgressSync] Tab state:`, { 
          hasTab: !!tab, 
          hasRendition: !!tab?.rendition,
          rendered: tab?.rendered 
        })
        
        if (tab?.rendition) {
          // Wait a bit longer for rendition to be fully ready
          setTimeout(() => {
            try {
              console.log(`[ReadProgressSync] Calling display() with cfi: ${progressToRestore!.cfi}`)
              tab.display(progressToRestore!.cfi!, false)
              console.log(
                `[ReadProgressSync] Restored position for book ${bookId} to ${progressToRestore!.percentage}%`
              )
              hasRestoredRef.current = true
              // Position restored, hide shimmer
              setIsRestoring(false)
            } catch (err) {
              console.error('[ReadProgressSync] Error restoring position:', err)
              hasRestoredRef.current = true // Mark as restored even on error to prevent loops
              setIsRestoring(false)
            }
          }, 1000) // Increased delay to ensure rendition is ready
        } else {
          console.log('[ReadProgressSync] No rendition available yet - will retry')
          // Don't set hasRestoredRef = true, so it will retry when rendition is ready
        }
      } else {
        console.log('[ReadProgressSync] No progress to restore')
        hasRestoredRef.current = true
        setIsRestoring(false)
      }

      // Initialize maxPercentageRef with the restored/saved progress
      // This prevents overwriting higher progress when navigating backwards
      const savedPercentage = progressToRestore?.percentage || 0
      maxPercentageRef.current = Math.max(maxPercentageRef.current, savedPercentage)
      console.log(`[ReadProgressSync] Initialized max percentage: ${maxPercentageRef.current}%`)

      lastSyncRef.current = {
        cfi: progressToRestore?.cfi || null,
        percentage: progressToRestore?.percentage || 0,
      }
    } catch (error) {
      console.error('[ReadProgressSync] Error restoring progress:', error)
      hasRestoredRef.current = true
      setIsRestoring(false)
    }
  }, [bookId])

  // Process sync queue when coming online
  const processSyncQueue = useCallback(async () => {
    if (!isOnline() || !isAuthenticated()) return

    const queue = getSyncQueue()
    if (queue.length === 0) return

    console.log(`[ReadProgressSync] Processing sync queue: ${queue.length} items`)

    for (const item of queue) {
      const numericBookId = parseInt(item.bookId, 10)
      if (isNaN(numericBookId)) continue

      try {
        await updateReadProgress(numericBookId, item.cfi, item.percentage)
        removeFromSyncQueue(item.bookId)
        console.log(`[ReadProgressSync] Synced queued progress for book ${item.bookId}`)
      } catch (error) {
        console.error(`[ReadProgressSync] Failed to sync queued item:`, error)
        // Keep in queue for next attempt
      }
    }
  }, [])

  // Debounced local save (fast)
  const debouncedLocalSave = useCallback(() => {
    if (localSaveTimeoutRef.current) {
      clearTimeout(localSaveTimeoutRef.current)
    }
    localSaveTimeoutRef.current = setTimeout(saveLocally, LOCAL_SAVE_DEBOUNCE)
  }, [saveLocally])

  // Debounced server sync (slower)
  const debouncedServerSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    syncTimeoutRef.current = setTimeout(syncToServer, SYNC_DEBOUNCE)
  }, [syncToServer])

  // Combined debounced save
  const debouncedSave = useCallback(() => {
    debouncedLocalSave()
    debouncedServerSync()
  }, [debouncedLocalSave, debouncedServerSync])

  // Restore position when book is opened and rendition is ready
  useEffect(() => {
    console.log(`[ReadProgressSync] Restore effect triggered:`, {
      bookId,
      rendered: focusedBookTab?.rendered,
      hasRendition: !!focusedBookTab?.rendition,
      hasRestored: hasRestoredRef.current
    })
    
    if (bookId && focusedBookTab?.rendered && focusedBookTab?.rendition) {
      restorePosition()
    }
  }, [bookId, focusedBookTab?.rendered, focusedBookTab?.rendition, restorePosition])

  // Track location changes
  useEffect(() => {
    const tab = reader.focusedBookTab
    if (!tab?.rendition || !bookId) return

    const handleRelocated = () => {
      debouncedSave()
    }

    tab.rendition.on('relocated', handleRelocated)

    return () => {
      tab.rendition?.off('relocated', handleRelocated)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current)
      }
    }
  }, [bookId, focusedBookTab?.rendition, debouncedSave])

  // Reset restored flag and max percentage when book changes
  useEffect(() => {
    hasRestoredRef.current = false
    maxPercentageRef.current = 0
    lastSyncRef.current = { cfi: null, percentage: 0 }
    hasSavedProgressRef.current = null
    setIsRestoring(false)
  }, [bookId])

  // Check for saved progress early (before rendering starts)
  useEffect(() => {
    if (bookId && hasSavedProgressRef.current === null) {
      checkForSavedProgress()
    }
  }, [bookId, checkForSavedProgress])

  // Process sync queue when coming online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[ReadProgressSync] Back online, processing queue...')
      processSyncQueue()
    }

    window.addEventListener('online', handleOnline)
    
    // Also process on mount if online
    if (isOnline()) {
      processSyncQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [processSyncQueue])

  // Final sync on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current)
      }
      // Save locally synchronously on unmount
      saveLocally()
      // Try server sync too
      syncToServer()
    }
  }, [saveLocally, syncToServer])

  return {
    syncToServer,
    saveLocally,
    calculatePercentage,
    getCurrentCfi,
    isRestoring,
  }
}
