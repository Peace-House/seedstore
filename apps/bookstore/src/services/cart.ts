import api from './apiService';
export interface CartItem {
  id: string|number;
  userId: string|number;
  quantity?: number;
  items:{
    ISBN: string;
    author: string;
    categoryId: number;
coverImage: string;
createdAt: string;
description: string;
featured: boolean;
fileUrl: string;
genre: string;
id: string|number;
pages: number;
price: number;
publishedDate: string;
rating: number;
title: string;
  }[];
}

// Example: Get user's cart
export const getCart = async () => {
  const res = await api.get('/cart');
  return res.data;
};


export const addToCart = async (bookId: string|number, quantity: number = 1) => {
  const res = await api.post('/cart/add', { bookId, quantity });
  return res.data;
};

export const removeFromCart = async (bookId: string|number) => {
  const res = await api.post('/cart/remove', { bookId });
  return res.data;
};
