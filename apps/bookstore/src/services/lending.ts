import api from './apiService';
import { Book } from './book';

export interface LendingPaginatedResponse {
  books: Book[];
  total: number;
  page: number;
  pageSize: number;
}

export const getLendingBooks = async (page = 1, pageSize = 20): Promise<LendingPaginatedResponse> => {
  const res = await api.get('/borrow/admin/books', { params: { page, pageSize } });
  return res.data;
};

export const updateLendingSettings = async (books: Partial<Book>[]): Promise<{ message: string }> => {
  const res = await api.put('/borrow/admin/settings', { books });
  return res.data;
};

export const getAllBorrows = async (page = 1, pageSize = 20, status?: string): Promise<any> => {
  const res = await api.get('/borrow/admin/borrows', { params: { page, pageSize, status } });
  return res.data;
};

export const revokeBorrow = async (borrowId: string): Promise<{ message: string }> => {
  const res = await api.post(`/borrow/admin/revoke/${borrowId}`);
  return res.data;
};
