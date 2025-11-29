import api from './apiService';

export interface BookPrice {
  id?: number;
  currency: string;
  country?: string | null;
  soft_copy_price: number;
  hard_copy_price: number;
}

export interface Book {
  id: number|string;
  orderId?: string;
  format?: string;
  title: string;
  author: string;
  price: number; // Deprecated: use prices array instead
  prices?: BookPrice[];
  coverImage?: string;
  category?: {
    id: number;
    name: string;
  };
  description?: string;
  fileUrl?: string;
  publishedDate?: string;
  pages?: number;
  ISBN?: string;
  featured?: boolean;
}

export interface PaginatedBooks {
  books: Book[];
  total: number;
  page: number;
  pageSize: number;
}

// Get all books (paginated)
export const getBooks = async (page = 1, pageSize = 10): Promise<PaginatedBooks> => {
  const res = await api.get('/books', { params: { page, pageSize } });
  return res.data;
};

// Get book by ID
export const getBookById = async (id: string): Promise<Book> => {
  const res = await api.get(`/books/${id}`);
  return res.data;
};

// Create a new book (with file and cover image upload)
export const createBook = async (formData: FormData): Promise<Book> => {
  const res = await api.post('/books', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Update a book
export const updateBook = async (id: string|number, data: Partial<Book> | FormData): Promise<Book> => {
  let config = {};
  const payload = data;
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    config = { headers: { 'Content-Type': 'multipart/form-data' } };
  }
  const res = await api.put(`/books/${id}`, payload, config);
  return res.data;
};

// Delete a book
export const deleteBook = async (id: string|number): Promise<{ message: string }> => {
  try {
    const res = await api.delete(`/books/${id}`);
    return res.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // If backend returns an error, surface the backend error message
    if (err.response && err.response.data && err.response.data.error) {
      throw new Error(err.response.data.error);
    }
    throw err;
  }
};

// Bulk update prices for all books
export const updateBooksPrices = async (books: { bookId: number|string, prices: { currency: string; country: string; soft_copy_price: number; hard_copy_price: number }[] }[]): Promise<{ message: string }> => {
  const res = await api.put('/pricing', { books });
  return res.data;
}

// Update prices for a specific book
export const updateBookPrices = async (bookId: number|string, prices: { country: string; soft_copy_price: number; hard_copy_price: number; currency: string }[]): Promise<{ message: string }> => {
  const res = await api.put(`/pricing/${bookId}`, { prices });
  return res.data;
}
