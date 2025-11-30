import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLibrary, addFreeBookToLibrary } from '@/services/library';
import { useAuth } from './useAuth';

// For anonymous users, fallback to localStorage (or empty)
const LIBRARY_STORAGE_KEY = 'anonymous_library';

export const useLibrary = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for purchased books
  const { data: library, isLoading, error } = useQuery({
    queryKey: ['library', user?.id],
    queryFn: async () => {
      if (!user) {
        // Anonymous: get from localStorage or empty
        const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      }
      // Logged-in: get from backend
      return await getLibrary();
    },
    enabled: true,
  });

  // Mutation to add free book to library
  const addFreeBookMutation = useMutation({
    mutationFn: (bookId: number) => addFreeBookToLibrary(bookId),
    onSuccess: () => {
      // Invalidate library to refresh the list
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });

  // Add book to anonymous library (for demo/testing)
  const addToLibrary = (book: { id: number }) => {
    if (user) return; // Only for anonymous
    const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
    const books = stored ? JSON.parse(stored) : [];
    if (!books.some((b: { id: number }) => b.id === book.id)) {
      const updated = [...books, book];
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  // Remove book from anonymous library
  const removeFromLibrary = (bookId: number) => {
    if (user) return;
    const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
    const books = stored ? JSON.parse(stored) : [];
    const updated = books.filter((b: { id: number }) => b.id !== bookId);
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));
  };

  return {
    library: Array.isArray(library) ? library : [],
    isLoading,
    error,
    addToLibrary,
    removeFromLibrary,
    addFreeBook: addFreeBookMutation.mutate,
    addFreeBookAsync: addFreeBookMutation.mutateAsync,
    isAddingFreeBook: addFreeBookMutation.isPending,
  };
};
