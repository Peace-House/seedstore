import api from './apiService';

export const getAllBookTitles = async (page = 1, pageSize = 10) => {
  const res = await api.get('/pricing/books', { params: { page, pageSize } });
  return { books: res.data.books, countryCurrencies: res.data.countryCurrencies, total: res.data.total };
};
