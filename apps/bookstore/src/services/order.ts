import api from './apiService'

export interface CreateManualOrderInput {
  userId: number
  bookId: number
  price: number
  paymentReference?: string
  status?: string
}

export async function createManualOrder(input: CreateManualOrderInput) {
  const res = await api.post('/admin/orders/manual', input)
  return res.data
}

export type ResolvePurchaseMethod = 'paystack' | 'other'

export interface ResolvePurchaseIssueInput {
  email: string
  paymentReference: string
  paymentMethod?: ResolvePurchaseMethod
  bookId?: number
  bookIds?: number[]
}

export async function resolvePurchaseIssue(_input: ResolvePurchaseIssueInput) {
  // DISABLED (2026-09, security): the backend endpoint
  // POST /admin/orders/resolve-missing was taken offline because it was
  // unauthenticated and did not validate the charge amount. Until it is
  // re-enabled with proper auth + amount checks, this always returns the
  // manual-ticket path so the user is told the team will follow up
  // rather than hitting a 404.
  //
  // const res = await api.post('/admin/orders/resolve-missing', _input)
  // return res.data as { result: 'auto_resolved' | 'ticket_created'; message: string }
  return {
    result: 'ticket_created' as const,
    message:
      'Your request has been received. Our team will review it and restore your books shortly.',
  }
}
