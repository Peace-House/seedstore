import api from './apiService';

export type PaymentMethod = 'paystack' | 'mtnmomo';

export const initiatePaystackPayment = async ({amount, email, callback_url}: {amount: number, email: string, callback_url: string}) => {
  const res = await api.post('/payment/initiate_paystack', { amount, email, callback_url });
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
