import api from './apiService';

// Subscribe to newsletter
export const subscribeToNewsletter = async (email: string): Promise<{ message: string }> => {
  const res = await api.post('/newsletter/subscribe', { email });
  return res.data;
};

// Unsubscribe from newsletter
export const unsubscribeFromNewsletter = async (email: string): Promise<{ message: string }> => {
  const res = await api.post('/newsletter/unsubscribe', { email });
  return res.data;
};
