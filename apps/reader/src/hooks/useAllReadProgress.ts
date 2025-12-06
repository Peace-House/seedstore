import { useCallback, useEffect, useState } from 'react'

import {
  getAllLocalProgress,
  isOnline,
} from '../services/localProgressService'
import {
  getAllReadProgress,
  ReadProgress,
  isAuthenticated,
} from '../services/readProgressService'

interface ReadProgressMap {
  [bookId: string]: ReadProgress
}

/**
 * Hook to fetch all reading progress with offline-first approach:
 * 1. Load from local IndexedDB immediately (fast, works offline)
 * 2. Fetch from server if online and merge (server takes priority for newer data)
 * 3. Refetch when page becomes visible
 */
export function useAllReadProgress() {
  const [progressMap, setProgressMap] = useState<ReadProgressMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProgress = useCallback(async () => {
    console.log('[useAllReadProgress] fetchProgress called, isOnline:', isOnline(), 'isAuthenticated:', isAuthenticated())
    
    try {
      setLoading(true)
      
      // First, load from local IndexedDB (fast, works offline)
      const localProgress = await getAllLocalProgress()
      console.log('[useAllReadProgress] Local progress from IndexedDB:', localProgress)
      
      const localMap: ReadProgressMap = {}
      for (const progress of localProgress) {
        localMap[progress.bookId] = {
          bookId: parseInt(progress.bookId, 10),
          cfi: progress.cfi,
          percentage: progress.percentage,
          lastReadAt: progress.lastReadAt ? new Date(progress.lastReadAt).toISOString() : null,
        }
      }
      
      // Set local progress immediately for fast UI (even if empty)
      setProgressMap(localMap)
      console.log('[useAllReadProgress] Set local progress map:', localMap)

      // If online and authenticated, fetch from server and merge
      if (isOnline() && isAuthenticated()) {
        try {
          const serverProgress = await getAllReadProgress()
          console.log('[useAllReadProgress] Server progress:', serverProgress)
          
          const mergedMap: ReadProgressMap = { ...localMap }
          
          for (const progress of serverProgress) {
            const bookId = String(progress.bookId)
            const localEntry = localMap[bookId]
            
            // Use server data if:
            // 1. No local data exists, or
            // 2. Server data is more recent
            if (!localEntry) {
              mergedMap[bookId] = progress
            } else {
              const serverTime = progress.lastReadAt 
                ? new Date(progress.lastReadAt).getTime() 
                : 0
              const localTime = localEntry.lastReadAt 
                ? new Date(localEntry.lastReadAt).getTime() 
                : 0
              
              if (serverTime > localTime) {
                mergedMap[bookId] = progress
              }
            }
          }
          
          setProgressMap(mergedMap)
          console.log('[useAllReadProgress] Final merged map:', mergedMap)
        } catch (err) {
          console.log('[useAllReadProgress] Could not fetch server progress, using local only:', err)
          // Keep local progress if server fetch fails
        }
      } else {
        console.log('[useAllReadProgress] Offline or not authenticated, using local only')
      }
    } catch (err) {
      console.error('[useAllReadProgress] Error fetching progress:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // Refetch when page becomes visible (user returns from reading)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProgress()
      }
    }

    // Also refetch on focus (for when navigating within the app)
    const handleFocus = () => {
      fetchProgress()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchProgress])

  /**
   * Get progress for a specific book
   */
  const getProgress = (bookId: string | number): ReadProgress | undefined => {
    const progress = progressMap[String(bookId)]
    console.log(`[useAllReadProgress] getProgress(${bookId}):`, progress, 'map:', progressMap)
    return progress
  }

  /**
   * Check if a book has been started (has any progress)
   */
  const isStarted = (bookId: string | number): boolean => {
    const progress = getProgress(bookId)
    const result = progress !== undefined && progress.percentage > 0
    console.log(`[useAllReadProgress] isStarted(${bookId}):`, result, 'percentage:', progress?.percentage)
    return result
  }

  /**
   * Check if a book is completed (100% progress)
   */
  const isCompleted = (bookId: string | number): boolean => {
    const progress = getProgress(bookId)
    const result = progress !== undefined && progress.percentage >= 100
    console.log(`[useAllReadProgress] isCompleted(${bookId}):`, result)
    return result
  }

  /**
   * Check if a book is currently being read (started but not completed)
   */
  const isReading = (bookId: string | number): boolean => {
    const progress = getProgress(bookId)
    const result = progress !== undefined && progress.percentage > 0 && progress.percentage < 100
    console.log(`[useAllReadProgress] isReading(${bookId}):`, result)
    return result
  }

  return {
    progressMap,
    loading,
    error,
    getProgress,
    isStarted,
    isCompleted,
    isReading,
    refetch: fetchProgress,
  }
}
