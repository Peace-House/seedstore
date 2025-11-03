import api from './apiService';

// Example: Get all categories
export const getCategories = async () => {
  const res = await api.get('/categories');
  return res.data;
};

// Add more category-related API functions as needed
