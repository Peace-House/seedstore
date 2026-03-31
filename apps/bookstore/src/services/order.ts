import api from './apiService';

export interface CreateManualOrderInput {
  userId: number;
  bookId: number;
  price: number;
  paymentReference?: string;
  status?: string;
}

export async function createManualOrder(input: CreateManualOrderInput) {
  const res = await api.post('/admin/orders/manual', input);
  return res.data;
}

export type ResolvePurchaseMethod = 'paystack' | 'mtnmomo' | 'other';

export interface ResolvePurchaseIssueInput {
  email: string;
  paymentReference: string;
  paymentMethod?: ResolvePurchaseMethod;
  bookId?: number;
  bookIds?: number[];
}

export async function resolvePurchaseIssue(input: ResolvePurchaseIssueInput) {
  const res = await api.post('/admin/orders/resolve-missing', input);
  return res.data as {
    result: 'auto_resolved' | 'ticket_created';
    message: string;
  };
}
