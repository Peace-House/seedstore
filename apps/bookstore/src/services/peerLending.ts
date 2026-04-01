import api from './apiService'

export interface PeerLendingConfig {
  peer_lending_enabled: boolean
  max_lend_duration_days: number
  allow_lender_access_during_lend: boolean
  max_books_borrowed_concurrently_per_user: number
  max_books_from_same_lender: number
  max_lends_per_book: number
}

export interface PeerLendingRecord {
  id: string
  bookId: number
  lenderId: number
  borrowerId: number
  startAt: string
  endAt: string
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  lenderHasAccess: boolean
  book: {
    id: number
    title: string
    author: string
    coverImage?: string
  }
  borrower?: {
    id: number
    firstName: string
    lastName: string
    email?: string
    phcode?: string
  }
  lender?: {
    id: number
    firstName: string
    lastName: string
    email?: string
  }
}

export const getPeerLendingConfig = async (): Promise<PeerLendingConfig> => {
  const res = await api.get('/lending/config')
  return res.data
}

export const createPeerLending = async (payload: {
  bookId: number | string
  recipient: string
  durationDays: number
}) => {
  const res = await api.post('/lending/peer', payload)
  return res.data as PeerLendingRecord
}

export const revokePeerLending = async (id: string) => {
  const res = await api.post(`/lending/${id}/revoke`)
  return res.data
}

export const getMyPeerLends = async (): Promise<PeerLendingRecord[]> => {
  const res = await api.get('/lending/my-lends')
  return res.data
}

export const getBorrowedFromOthers = async (): Promise<PeerLendingRecord[]> => {
  const res = await api.get('/lending/borrowed')
  return res.data
}
