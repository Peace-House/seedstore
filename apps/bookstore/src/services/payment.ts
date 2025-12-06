import api from './apiService';

export type PaymentMethod = 'paystack' | 'mtnmomo' | 'applepay';

export const initiatePaystackPayment = async ({
  amount,
  email,
  callback_url,
  channels,
}: {
  amount: number;
  email: string;
  callback_url: string;
  channels?: string[];
}) => {
  const res = await api.post('/payment/initiate_paystack', { amount, email, callback_url, channels });
  return res.data;
};

export const verifyPaystackPayment = async (reference: string) => {
  const res = await api.get(`/payment/verify_paystack?reference=${reference}`);
  return res.data;
};

export const initiateMtnMomoPayment = async ({
  amount,
  currency,
  phone,
  payerMessage,
  payeeNote,
}: {
  amount: number;
  currency: string;
  phone: string;
  payerMessage?: string;
  payeeNote?: string;
}) => {
  const res = await api.post('/payment/initiate_mtnmomo', {
    amount,
    currency,
    phone,
    payerMessage,
    payeeNote,
  });
  return res.data;
};

export const verifyMtnMomoPayment = async (referenceId: string) => {
  const res = await api.get(`/payment/verify_mtnmomo/status/${referenceId}`);
  return res.data;
};

// Paystack transaction types
export interface PaystackTransaction {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string | null;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  fees: number | null;
  customer: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };
  authorization?: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
  };
}

export interface PaystackTransactionsResponse {
  status: string;
  message: string;
  data?: PaystackTransaction[];
  meta?: {
    total: number;
    skipped: number;
    perPage: number;
    page: number;
    pageCount: number;
  };
}

export interface ListTransactionsParams {
  page?: number;
  perPage?: number;
  from?: string;
  to?: string;
  status?: 'success' | 'failed' | 'abandoned';
}

export const listPaystackTransactions = async (
  params: ListTransactionsParams = {}
): Promise<PaystackTransactionsResponse> => {
  const res = await api.get('/payment/transactions', { params });
  return res.data;
};
