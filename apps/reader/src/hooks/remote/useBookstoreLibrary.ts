import useSWR from 'swr/immutable'
import axios from 'axios'

// You may want to move this to an env variable or config
const API_BASE_URL = 'http://localhost:4000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Fetch all books from the bookstore server (replica of bookstore getLibrary)
export function useBookstoreLibrary() {
  const { data, error } = useSWR('bookstore/library', async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const res = await api.get('/library', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    console.log('Bookstore library response:', res.data);   
    return res.data
  })

  console.log('useBookstoreLibrary data:', data, 'error:', error);
  const transformedData = data ? data?.map((book: any) => ({
    ...book,
    id: String(book.id), // Ensure id is a string
      name: String(book.title),
      size: Number(book?.size),
      cover: book?.coverImage || null,
      metadata: {},
      createdAt: Number(book?.createdAt),
      updatedAt: book?.updatedAt ? Number(book.updatedAt) : undefined,
      cfi: book?.cfi,
      percentage: book?.percentage,
      definitions: book?.description,
      annotations: book?.annotations,
      configuration: {
        typography: book?.configuration?.typography,
      },
  })) : []
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
