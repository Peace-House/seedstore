import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, addToCart as addToCartApi, removeFromCart as removeFromCartApi, CartItem } from '@/services/cart';
import { useAuth } from './useAuth';
import { useState, useEffect, useRef } from 'react';
import { Book } from '@/services';

const CART_STORAGE_KEY = 'anonymous_cart';

export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncedRef = useRef(false); // Use ref to persist across renders

  // Store array of book objects for anonymous cart
  const [localCart, setLocalCart] = useState<(CartItem | Book)[]>(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Reset synced flag when user logs out
  useEffect(() => {
    if (!user) {
      syncedRef.current = false;
    }
  }, [user]);

  // Sync localStorage cart to backend when user logs in
  useEffect(() => {
    const syncCartOnLogin = async () => {
      // Only sync once when user logs in and has local cart items
      // Use ref to prevent multiple syncs even if component re-renders
      if (user && localCart.length > 0 && !syncedRef.current && !isSyncing) {
        syncedRef.current = true; // Set immediately to prevent duplicate calls
        setIsSyncing(true);

        try {
          // Fetch backend cart
          let backendCart: any = [];
          try {
            backendCart = await getCart();
          } catch {
            console.error('Failed to fetch backend cart during sync.');
          }

          const backendBookIds = Array.isArray(backendCart?.items)
            ? backendCart.items.map((item: any) => item.book?.id || item.bookId)
            : [];

          // Only add books not already in backend cart
          for (const item of localCart) {
            if (!backendBookIds.includes(item.id)) {
              await addToCartApi(item.id as number, 1);
            }
          }

          // Clear local cart after successful sync
          localStorage.removeItem(CART_STORAGE_KEY);
          setLocalCart([]);

          // Invalidate queries to fetch fresh backend cart
          await queryClient.invalidateQueries({ queryKey: ['cart'] });
          await queryClient.invalidateQueries({ queryKey: ['cart-count'] });
        } catch (error) {
          console.error('Error syncing cart:', error);
          // Reset flag on error so user can retry
          syncedRef.current = false;
        } finally {
          setIsSyncing(false);
        }
      }
    };
    syncCartOnLogin();
  }, [user]); // Only depend on user to trigger sync once on login

  // Get cart (array for anonymous, backend object for logged-in)
  const { data: rawCart, isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) {
        // Return cart from localStorage for anonymous users
        return localCart;
      }
      // Return cart from backend for logged-in users
      return await getCart();
    },
    enabled: !isSyncing, // Don't fetch while syncing
  });

  // For anonymous: rawCart is array of book objects
  // For logged-in: rawCart.items is array of cart items
  const cartItems = Array.isArray(rawCart)
    ? rawCart
    : Array.isArray(rawCart?.items)
      ? rawCart.items
      : [];
  const cartCount = cartItems.length;

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (book: Book) => {
      if (!user) {
        // Add full book object to localStorage for anonymous users
        const exists = localCart.some((item) => item.id === book.id);
        if (exists) return;
        const updated = [...localCart, book];
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
        setLocalCart(updated);
        return;
      }
      // Add to backend for logged-in users
      await addToCartApi(book.id, 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
    },
  });

  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async ({ bookId }: { bookId: number | string }) => {
      if (!user) {
        // Remove from localStorage for anonymous users
        const updated = localCart.filter(item => item.id != bookId);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
        setLocalCart(updated);
        return;
      }
      // For logged-in users, remove from backend using bookId
      if (bookId) {
        await removeFromCartApi(bookId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
    },
  });

  return {
    cartItems,
    cartCount,
    isLoading,
    addToCart: addToCartMutation.mutate,
    removeFromCart: removeFromCartMutation.mutate,
    isAddingToCart: addToCartMutation.isPending,
    isRemovingFromCart: removeFromCartMutation.isPending,
  };
};
