import { db, BookRecord } from '../db'

export interface LocalProgress {
  bookId: string
  cfi: string | null
  percentage: number
  lastReadAt: number
  pendingSync: boolean // True if needs to be synced to server
}

/**
 * Get reading progress from local IndexedDB
 * Percentage is converted from decimal (0-1) to percentage (0-100)
 */
export async function getLocalProgress(bookId: string): Promise<LocalProgress | null> {
  if (!db) return null
  
  try {
    const book = await db.books.get(bookId)
    if (!book) return null
    
    // book.percentage is stored as decimal (0-1), convert to 0-100
    const percentage = book.percentage ? Math.round(book.percentage * 100) : 0
    
    return {
      bookId: book.id,
      cfi: book.cfi || null,
      percentage,
      lastReadAt: typeof book.updatedAt === 'number' ? book.updatedAt : Date.now(),
      pendingSync: false,
    }
  } catch (error) {
    console.error('[LocalProgress] Error getting progress:', error)
    return null
  }
}

/**
 * Get all reading progress from local IndexedDB
 * Percentage is converted from decimal (0-1) to percentage (0-100)
 */
export async function getAllLocalProgress(): Promise<LocalProgress[]> {
  if (!db) return []
  
  try {
    const books = await db.books.toArray()
    return books
      .filter(book => book.cfi || (book.percentage && book.percentage > 0))
      .map(book => {
        // book.percentage is stored as decimal (0-1), convert to 0-100
        const percentage = book.percentage ? Math.round(book.percentage * 100) : 0
        return {
          bookId: book.id,
          cfi: book.cfi || null,
          percentage,
          lastReadAt: typeof book.updatedAt === 'number' ? book.updatedAt : Date.now(),
          pendingSync: false,
        }
      })
  } catch (error) {
    console.error('[LocalProgress] Error getting all progress:', error)
    return []
  }
}

/**
 * Save reading progress to local IndexedDB
 * Creates a minimal book record if it doesn't exist
 * Percentage is expected as 0-100, stored as decimal (0-1)
 * Returns true if saved successfully
 */
export async function saveLocalProgress(
  bookId: string,
  cfi: string | null,
  percentage: number
): Promise<boolean> {
  if (!db) return false
  
  // Convert percentage from 0-100 to 0-1 decimal for storage
  const decimalPercentage = percentage / 100
  
  try {
    const book = await db.books.get(bookId)
    
    if (book) {
      // Update existing book record
      await db.books.update(bookId, {
        cfi: cfi || undefined,
        percentage: decimalPercentage,
        updatedAt: Date.now(),
      })
    } else {
      // Create a minimal book record to store progress
      // This handles the case where the book is loaded from remote server
      // but not yet in local IndexedDB
      const minimalBook: BookRecord = {
        id: bookId,
        name: `book-${bookId}`,
        size: 0,
        metadata: {} as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        cfi: cfi || undefined,
        percentage: decimalPercentage,
        definitions: [],
        annotations: [],
      }
      await db.books.put(minimalBook)
      console.log(`[LocalProgress] Created minimal book record for ${bookId}`)
    }
    
    console.log(`[LocalProgress] Saved progress for book ${bookId}: ${percentage}% (stored as ${decimalPercentage})`)
    return true
  } catch (error) {
    console.error('[LocalProgress] Error saving progress:', error)
    return false
  }
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

/**
 * Queue for syncing progress when offline
 * Uses localStorage to persist queue across page refreshes
 */
const SYNC_QUEUE_KEY = 'progress_sync_queue'

interface SyncQueueItem {
  bookId: string
  cfi: string | null
  percentage: number
  timestamp: number
}

export function getSyncQueue(): SyncQueueItem[] {
  if (typeof localStorage === 'undefined') return []
  const queue = localStorage.getItem(SYNC_QUEUE_KEY)
  return queue ? JSON.parse(queue) : []
}

export function addToSyncQueue(item: Omit<SyncQueueItem, 'timestamp'>): void {
  if (typeof localStorage === 'undefined') return
  
  const queue = getSyncQueue()
  // Remove existing entry for same book (keep only latest)
  const filtered = queue.filter(q => q.bookId !== item.bookId)
  filtered.push({ ...item, timestamp: Date.now() })
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered))
  console.log(`[LocalProgress] Added to sync queue: book ${item.bookId}`)
}

export function removeFromSyncQueue(bookId: string): void {
  if (typeof localStorage === 'undefined') return
  
  const queue = getSyncQueue()
  const filtered = queue.filter(q => q.bookId !== bookId)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered))
}

export function clearSyncQueue(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(SYNC_QUEUE_KEY)
}
