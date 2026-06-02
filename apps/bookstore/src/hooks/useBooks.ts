import { useQuery } from '@tanstack/react-query';
import { getBooks, getBookById, Book, PaginatedBooks } from '@/services/book';

// Fetch paginated books
export function useBooks(page = 1, pageSize = 12) {
  return useQuery<PaginatedBooks>({
    queryKey: ['books', page, pageSize],
    queryFn: () => getBooks(page, pageSize),
  });
}

// Fetch every featured book in one shot. Uses the backend
// `/books?featured=true` filter so the home "Featured" rail reflects
// the entire featured set instead of just whatever happened to land on
// page 1 of the default catalog. pageSize is sized for the realistic
// upper bound of curated featured titles — bump or paginate if we
// ever cross it.
export function useFeaturedBooks(pageSize = 50) {
  return useQuery<PaginatedBooks>({
    queryKey: ['featured-books', pageSize],
    queryFn: () => getBooks({ featured: true, pageSize }),
    // Featured set changes infrequently — admin toggles, not per
    // navigation. Keep it in cache for 10 min so route changes don't
    // refetch on every visit.
    staleTime: 10 * 60 * 1000,
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
