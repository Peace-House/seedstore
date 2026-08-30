import { useQuery } from '@tanstack/react-query';

import BookSlider from './BookSlider';
import { getBooks, Book, getBookCategoryIds } from '@/services/book';

interface RelatedBooksProps {
  categoryId: string | number;
  excludeBookId?: string | number;
  showActions?: boolean;
}

const RelatedBooks = ({ categoryId, excludeBookId, showActions }: RelatedBooksProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['related-books', categoryId],
    queryFn: async () => {
      const res = await getBooks(1, 8); // Fetch up to 8 books
      return res.books.filter(
        // Related = shares ANY category with the current book, not just
        // its legacy primary one.
        (b: Book) =>
          getBookCategoryIds(b).some((id) => String(id) === String(categoryId)) &&
          b.id !== excludeBookId
      );
    },
    enabled: !!categoryId,
  });
  if (isLoading) return null;
  if (!data || data.length === 0) return null;
  return (
      <BookSlider books={data} title="Related Books" showActions={showActions} autoScroll={false} />
  );
};

export default RelatedBooks;
