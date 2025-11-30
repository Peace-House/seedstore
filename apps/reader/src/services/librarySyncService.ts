import { db, BookRecord } from '../db'

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('auth_token')
}

/**
 * Sync local library with remote library
 * Removes books from local DB that are no longer in the user's remote library
 */
export async function syncLocalLibraryWithRemote(
  remoteBooks: BookRecord[],
): Promise<void> {
  if (!db || !isAuthenticated()) return

  try {
    // Get all local books
    const localBooks = await db.books.toArray()

    if (!localBooks.length) return

    // Create a set of remote book IDs for quick lookup
    const remoteBookIds = new Set(remoteBooks.map((b) => String(b.id)))

    // Find books that exist locally but not in remote
    const booksToRemove = localBooks.filter(
      (local) => !remoteBookIds.has(String(local.id)),
    )

    if (booksToRemove.length > 0) {
      const idsToRemove = booksToRemove.map((b) => b.id)

      // Remove from books table
      await db.books.bulkDelete(idsToRemove)

      // Remove associated files
      await db.files.bulkDelete(idsToRemove)

      // Remove associated covers
      await db.covers.bulkDelete(idsToRemove)

      console.log(
        `[LibrarySync] Removed ${booksToRemove.length} books not in remote library:`,
        idsToRemove,
      )
    }
  } catch (error) {
    console.error('[LibrarySync] Error syncing library:', error)
  }
}

/**
 * Clear all local data (for logout)
 * Removes all books, files, covers, and auth token
 */
export async function clearAllLocalData(): Promise<void> {
  try {
    // Clear IndexedDB tables
    if (db) {
      await db.books.clear()
      await db.files.clear()
      await db.covers.clear()
      console.log('[LibrarySync] Cleared all local database tables')
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      // Clear any other user-related data
      localStorage.removeItem('user')
      localStorage.removeItem('userId')
      console.log('[LibrarySync] Cleared auth token and user data')
    }
  } catch (error) {
    console.error('[LibrarySync] Error clearing local data:', error)
    throw error
  }
}

/**
 * Logout user - clears all local data and optionally redirects
 */
export async function logout(redirectUrl?: string): Promise<void> {
  await clearAllLocalData()

  if (redirectUrl && typeof window !== 'undefined') {
    window.location.href = redirectUrl
  }
}
