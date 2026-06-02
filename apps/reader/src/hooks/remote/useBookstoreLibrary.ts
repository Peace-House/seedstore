import axios from 'axios'
import { useMemo } from 'react'
import useSWR from 'swr'

// You may want to move this to an env variable or config
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

/** Persisted snapshot of the last successful library response. Used as
 *  SWR fallbackData on cold start so the reader's library-sync logic
 *  has something to work with immediately, instead of waiting for the
 *  /library round-trip before painting. SSE keeps individual records
 *  fresh once we're online; this only avoids the cold blank state. */
const LIBRARY_CACHE_KEY = 'reader_bookstore_library_cache_v1'

function readCachedLibrary(): any[] | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(LIBRARY_CACHE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function writeCachedLibrary(data: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(data))
  } catch {
    /* quota exceeded or storage disabled — skip silently */
  }
}

// Fetch all books from the bookstore server (replica of bookstore getLibrary)
export function useBookstoreLibrary() {
  const { data, error } = useSWR(
    'bookstore/library',
    async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const res = await api.get('/library', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      console.log('Bookstore library response:', res.data);
      // Persist for the next cold start.
      writeCachedLibrary(res.data)
      return res.data
    },
    {
      // Render the previous library instantly while the network call
      // refetches in the background. Cuts perceived load time on a
      // returning user from "however long /library takes" to "0".
      fallbackData: readCachedLibrary(),
      // Revalidate when window regains focus (e.g., coming back from reader)
      revalidateOnFocus: true,
      // Revalidate when network reconnects
      revalidateOnReconnect: true,
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
    },
  )

  console.log('useBookstoreLibrary data:', data, 'error:', error);
  // Memoise the transformed array so its reference stays stable while
  // SWR's underlying `data` hasn't changed. Without this, hooks /
  // effects downstream (useLibrarySync, library list rendering, etc.)
  // re-run on every parent render and can cascade into surprise loops.
  const transformedData = useMemo(() => {
    if (!data) return []
    return data.map((book: any) => ({
      ...book,
      id: String(book.id), // Ensure id is a string
      name: String(book.title),
      size: Number(book?.size),
      cover: book?.coverImage || null,
      metadata: {},
      createdAt: Number(book?.createdAt),
      updatedAt: book?.updatedAt ? Number(book.updatedAt) : undefined,
      cfi: book?.cfi,
      // Server returns percentage as 0-100, reader internally uses 0-1 decimal
      percentage: book?.percentage ? book.percentage / 100 : undefined,
      definitions: book?.description,
      annotations: book?.annotations,
      configuration: {
        typography: book?.configuration?.typography,
      },
    }))
  }, [data])
  return transformedData
}

// Example: Get user's library
export const getLibrary = async () => {
  const res = await api.get('/library');
  // Backend returns array of books, each with orderId property
  return res.data;
};

// Email user's library (all purchased books)
export const emailLibrary = async (email: string) => {
  const res = await api.post('/library/email', { email });
  return res.data;
};

// Save reading progress for a book
export const saveProgress = async (bookId: string, progress: number) => {
  const res = await api.post('/library/progress', { bookId, progress });
  return res.data;
};

// Get reading progress for a book
export const getProgress = async (bookId: string) => {
  const res = await api.get(`/library/progress/${bookId}`);
  return res.data;
};
