import axios from 'axios';
import useSWR from 'swr/immutable';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

async function fetchLibraryBookById(orderId: string, bookId: string | null) {
  if (!orderId || !bookId) throw new Error('Missing orderId or bookId');
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  try {
    const res = await api.get(`/library/access/${orderId}/${bookId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to fetch book from server');
  }
}

export function useGetLibraryBookById(orderId?: string, bookId?: string | null) {
  const shouldFetch = !!orderId && !!bookId;
  const { data, error, isValidating } = useSWR(
    shouldFetch ? ['library-book', orderId, bookId] : null,
    () => fetchLibraryBookById(orderId!, bookId!),
    { shouldRetryOnError: false }
  );
  const isLoading = !data && !error;
  // Transform the book object to match useBookstoreLibrary
  const transformedBook = data
    ? {
      ...data,
      id: String(data.id),
      name: String(data.title),
      size: Number(data?.size),
      cover: data?.coverImage || null,
      metadata: {},
      createdAt: Number(data?.createdAt),
      updatedAt: data?.updatedAt ? Number(data.updatedAt) : undefined,
      cfi: data?.cfi,
      percentage: data?.percentage,
      definitions: data?.description,
      annotations: data?.annotations,
      configuration: {
        typography: data?.configuration?.typography,
      },
    }
    : undefined;
  return { book: transformedBook, error, isLoading: isLoading || isValidating };
}
