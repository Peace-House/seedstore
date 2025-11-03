import api from './apiService';

// Example: Checkout cart
export interface CheckoutPayload {
  amount: number;
  email: string;
  userId: string | number;
  cartItems: string[];
}

export const checkout = async () => {
  const res = await api.post('/checkout');
  return res.data;
};

