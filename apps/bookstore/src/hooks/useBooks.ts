import { useQuery } from '@tanstack/react-query';
import { getBooks, getBookById, Book, PaginatedBooks } from '@/services/book';

// Fetch paginated books
export function useBooks(page = 1, pageSize = 12) {
  return useQuery<PaginatedBooks>({
    queryKey: ['books', page, pageSize],
    queryFn: () => getBooks(page, pageSize),
  });
}

// Fetch a single book by ID
export function useBook(id: string | number) {
  return useQuery<Book>({
    queryKey: ['book', id],
    queryFn: () => getBookById(String(id)),
    enabled: !!id,
  });
}
