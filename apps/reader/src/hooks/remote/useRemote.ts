import axios from 'axios'
import useSWR from 'swr/immutable'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Fetch all remote files from the server
export function useRemoteFiles() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return useSWR('remote/files', async () => {
    const res = await api.get('/files', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return res.data
  }, { shouldRetryOnError: false })
}

// Fetch all remote books from the server
export function useRemoteBooks() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return useSWR('remote/library', async () => {
    const res = await api.get('/library', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return res.data
  }, { shouldRetryOnError: false })
}

// Fetch a single remote book by ID
export function useRemoteBook(id: string | number) {
  const { data: books, ...rest } = useRemoteBooks()
  const book = books?.find((b: any) => b.id === id || b.id === String(id))
  return { book, ...rest }
}
