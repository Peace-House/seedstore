import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface ReadProgress {
  bookId: number
  cfi: string | null
  percentage: number
  lastReadAt: string | null
}

export interface ReadProgressWithBook extends ReadProgress {
  book: {
    id: number
    title: string
    coverImage: string | null
    author: string
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('auth_token')
}

/**
 * Get reading progress for a specific book
 */
export async function getReadProgress(bookId: number): Promise<ReadProgress> {
  const response = await api.get<ReadProgress>(`/read-progress/${bookId}`)
  return response.data
}

/**
 * Get reading progress for all books
 */
export async function getAllReadProgress(): Promise<ReadProgressWithBook[]> {
  const response = await api.get<ReadProgressWithBook[]>('/read-progress')
  return response.data
}

/**
 * Update reading progress for a book
 */
export async function updateReadProgress(
  bookId: number,
  cfi: string | null,
  percentage: number
): Promise<ReadProgress> {
  const response = await api.post<ReadProgress>('/read-progress', {
    bookId,
    cfi,
    percentage,
  })
  return response.data
}

/**
 * Delete reading progress for a book
 */
export async function deleteReadProgress(bookId: number): Promise<void> {
  await api.delete(`/read-progress/${bookId}`)
}
