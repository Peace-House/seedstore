import useSWR from 'swr/immutable'

import {
  DATA_FILENAME,
  dropboxBooksFetcher,
  dropboxFilesFetcher,
} from '@flow/reader/sync'

export function useRemoteFiles() {
  return useSWR('/files', dropboxFilesFetcher, { shouldRetryOnError: false })
}

export function useRemoteBooks() {
  return useSWR(`/${DATA_FILENAME}`, dropboxBooksFetcher, {
    shouldRetryOnError: false,
  })
}

// Fetch a single remote book by ID
export function useRemoteBook(id: string | number) {
  const { data: books, ...rest } = useRemoteBooks()
  const book = books?.find((b: any) => b.id === id || b.id === String(id))
  return { book, ...rest }
}
