import axios from 'axios';
import { useMemo } from 'react';
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

  // Memoise the transformed book so the reference stays stable while
  // SWR's underlying `data` hasn't actually changed. Without this,
  // every render returns a fresh `book` object reference, which makes
  // any consumer using it in a useEffect dependency array fire its
  // effect on every parent re-render — most painfully, the reader's
  // book-open effect kept cancelling and re-issuing the download in a
  // tight loop, hammering /library/download repeatedly.
  const transformedBook = useMemo(() => {
    if (!data) return undefined;
    return {
      ...data,
      id: String(data.id),
      name: String(data.title),
      size: Number(data?.size),
      cover: data?.coverImage || null,
      metadata: {},
      createdAt: Number(data?.createdAt),
      updatedAt: data?.updatedAt ? Number(data.updatedAt) : undefined,
      cfi: data?.cfi,
      // Server returns percentage as 0-100, reader internally uses 0-1 decimal
      percentage: data?.percentage ? data.percentage / 100 : undefined,
      definitions: data?.description,
      annotations: data?.annotations,
      configuration: {
        typography: data?.configuration?.typography,
      },
    };
  }, [data]);

  return { book: transformedBook, error, isLoading: isLoading || isValidating };
}
