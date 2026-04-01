import api from './apiService'
import { Book } from './book'

export interface LendingFeatureConfig {
  seedstore_lending_enabled: boolean
  peer_lending_enabled: boolean
  max_lend_duration_days: number
  allow_lender_access_during_lend: boolean
  max_books_borrowed_concurrently_per_user: number
  max_books_from_same_lender: number
  max_lends_per_book: number
}

export interface LendingPaginatedResponse {
  books: Book[]
  total: number
  page: number
  pageSize: number
}

export const getLendingBooks = async (
  page = 1,
  pageSize = 20,
): Promise<LendingPaginatedResponse> => {
  const res = await api.get('/borrow/admin/books', {
    params: { page, pageSize },
  })
  return res.data
}

export const updateLendingSettings = async (
  books: Partial<Book>[],
): Promise<{ message: string }> => {
  const res = await api.put('/borrow/admin/settings', { books })
  return res.data
}

export const getAllBorrows = async (
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<any> => {
  const res = await api.get('/borrow/admin/borrows', {
    params: { page, pageSize, status },
  })
  return res.data
}

export const revokeBorrow = async (
  borrowId: string,
): Promise<{ message: string }> => {
  const res = await api.post(`/borrow/admin/revoke/${borrowId}`)
  return res.data
}

export const getLendingFeatureConfig =
  async (): Promise<LendingFeatureConfig> => {
    const res = await api.get('/app-config')
    return {
      seedstore_lending_enabled: !!res.data?.seedstore_lending_enabled,
      peer_lending_enabled: !!res.data?.peer_lending_enabled,
      max_lend_duration_days: Number(res.data?.max_lend_duration_days ?? 14),
      allow_lender_access_during_lend:
        res.data?.allow_lender_access_during_lend !== false,
      max_books_borrowed_concurrently_per_user: Number(
        res.data?.max_books_borrowed_concurrently_per_user ?? 3,
      ),
      max_books_from_same_lender: Number(
        res.data?.max_books_from_same_lender ?? 2,
      ),
      max_lends_per_book: Number(res.data?.max_lends_per_book ?? 5),
    }
  }

export const updateLendingFeatureConfig = async (
  input: Partial<LendingFeatureConfig>,
): Promise<LendingFeatureConfig> => {
  const res = await api.put('/app-config', input)
  return {
    seedstore_lending_enabled: !!res.data?.seedstore_lending_enabled,
    peer_lending_enabled: !!res.data?.peer_lending_enabled,
    max_lend_duration_days: Number(res.data?.max_lend_duration_days ?? 14),
    allow_lender_access_during_lend:
      res.data?.allow_lender_access_during_lend !== false,
    max_books_borrowed_concurrently_per_user: Number(
      res.data?.max_books_borrowed_concurrently_per_user ?? 3,
    ),
    max_books_from_same_lender: Number(
      res.data?.max_books_from_same_lender ?? 2,
    ),
    max_lends_per_book: Number(res.data?.max_lends_per_book ?? 5),
  }
}
