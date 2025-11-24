import api from './apiService';

export const initiatePaystackPayment = async ({amount, email, callback_url}: {amount: number, email: string, callback_url: string}) => {
  const res = await api.post('/payment/initiate_paystack', { amount, email, callback_url });
  return res.data;
};

export const verifyPaystackPayment = async (reference: string) => {
  const res = await api.get(`/payment/verify_paystack?reference=${reference}`);
  return res.data;
};
