import api from './apiService';

export const initiatePaystackPayment = async ({amount, email, callback_url}: {amount: number, email: string, callback_url: string}) => {
  const res = await api.post('/paystack/initiate', { amount, email, callback_url });
  return res.data;
};

export const verifyPaystackPayment = async (reference: string) => {
  const res = await api.get(`/paystack/verify?reference=${reference}`);
  return res.data;
};
