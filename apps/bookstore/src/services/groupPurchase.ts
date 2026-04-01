import api from './apiService'

export interface GroupPurchaseSeat {
  id: string
  groupPurchaseId: string
  phcode: string | null
  assignedUserId: number | null
  assignedAt: string | null
  notified: boolean
  createdAt: string
}

export interface GroupPurchase {
  id: string
  buyerId: number
  bookId: number
  totalSeats: number
  assignedSeats: number
  pricePerSeat: number
  discountPercent: number
  totalPaid: number
  paymentReference: string | null
  status: 'PENDING' | 'PAID' | 'COMPLETED'
  createdAt: string
  updatedAt: string
  book: {
    id: number
    title: string
    author: string
    coverImage: string | null
    prices: { currency: string; soft_copy_price: number | null }[]
  }
  seats: GroupPurchaseSeat[]
}

export const checkPHCodes = async (
  phcodes: string[],
): Promise<{ results: { phcode: string; exists: boolean }[] }> => {
  const res = await api.post('/group-purchase/check-phcodes', { phcodes })
  return res.data
}

export const setupGroupPurchase = async (params: {
  bookId: number | string
  totalSeats: number
  assignNow: boolean
  phcodes?: string[]
  currency?: string
}) => {
  const res = await api.post('/group-purchase/setup', params)
  return res.data
}

export const getMyGroupPurchases = async (): Promise<GroupPurchase[]> => {
  const res = await api.get('/group-purchase')
  return res.data
}

export const getGroupPurchase = async (id: string): Promise<GroupPurchase> => {
  const res = await api.get(`/group-purchase/${id}`)
  return res.data
}

export const assignGroupPurchaseSeats = async (
  id: string,
  phcodes: string[],
) => {
  const res = await api.post(`/group-purchase/${id}/assign`, { phcodes })
  return res.data
}

export const removeGroupPurchase = async (id: string) => {
  const res = await api.delete(`/group-purchase/${id}`)
  return res.data
}

export const getCartWithGroupPurchases = async (currency?: string) => {
  const res = await api.get('/group-purchase/cart-summary', {
    params: currency ? { currency } : undefined,
  })
  return res.data
}

/**
 * Calculate discount percent based on seat count.
 */
export function getGroupBuyDiscount(seats: number): number {
  if (seats >= 50) return 10
  if (seats >= 25) return 5
  return 0
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface GroupBuyBookSetting {
  id: number | string
  title: string
  author: string | null
  allowGroupBuy: boolean
}

export const getGroupBuyBooks = async (
  page = 1,
  pageSize = 20,
): Promise<{
  books: GroupBuyBookSetting[]
  total: number
  page: number
  pageSize: number
}> => {
  const res = await api.get('/group-purchase/admin/books', {
    params: { page, pageSize },
  })
  return res.data
}

export const updateGroupBuySettings = async (
  books: { id: number | string; allowGroupBuy: boolean }[],
): Promise<{ message: string }> => {
  const res = await api.put('/group-purchase/admin/settings', { books })
  return res.data
}
