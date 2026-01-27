import axios from 'axios';

export interface CreateManualOrderInput {
  userId: number;
  bookId: number;
  price: number;
  paymentReference?: string;
  status?: string;
}

export async function createManualOrder(input: CreateManualOrderInput) {
  const res = await axios.post('/api/orders/manual', input);
  return res.data;
}
