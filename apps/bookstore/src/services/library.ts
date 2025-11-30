// Check if user has access to a book (by orderId and bookId)
export const getLibraryAccess = async (orderId: string, bookId: string) => {
  const res = await api.get(`/library/access/${orderId}/${bookId}`);
  return res.data;
};
import api from './apiService';

// Example: Get user's library
export const getLibrary = async () => {
  const res = await api.get('/library');
  // Backend returns array of books, each with orderId property
  return res.data;
};

// Email user's library (all purchased books)
export const emailLibrary = async (email: string) => {
  const res = await api.post('/library/email', { email });
  return res.data;
};

// Save reading progress for a book
export const saveProgress = async (bookId: string, progress: number) => {
  const res = await api.post('/library/progress', { bookId, progress });
  return res.data;
};

// Get reading progress for a book
export const getProgress = async (bookId: string) => {
  const res = await api.get(`/library/progress/${bookId}`);
  return res.data;
};

// Add a free book to user's library
export const addFreeBookToLibrary = async (bookId: number) => {
  const res = await api.post('/library/add-free', { bookId });
  return res.data;
};

// Add more library-related API functions as needed
