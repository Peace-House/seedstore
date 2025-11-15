import { useQuery } from '@tanstack/react-query';
import { getBooks } from '@/services/book';
import { getCategories } from '@/services/category';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { useState } from 'react';
import { BookOpen, Grid, List } from 'lucide-react';
import BooksFilterSidebar from './BooksFilterSidebar';
import BooksGridView from './BooksGridView';
import BooksListView from './BooksListView';
import LiquidGlassWrapper from './LiquidGlassWrapper';

const AllBooks = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'authors'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<(string | number)[]>([]);
  const [authorFilter, setAuthorFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['all-books', page],
    queryFn: async () => {
      const res = await getBooks(page, pageSize);
      return res;
    },
  });
  const books = data?.books || [];
  const total = data?.total || 0;
  const uniqueAuthors = Array.from(new Set(books.map(book => book.author).filter(Boolean)));

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter.length === 0 || (book.category && categoryFilter.includes(book.category.id));
    const matchesAuthor = authorFilter.length === 0 || authorFilter.includes(book.author);
    const price = Number(book.price);
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    const matchesPrice =
      (min === null || price >= min) &&
      (max === null || price <= max);
    return matchesSearch && matchesCategory && matchesAuthor && matchesPrice;
  });

  if (isLoading) {
    return (
      <section className="container py-16">
        <h2 className="text-3xl font-bold mb-8">All Books</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="bg-black/10 h-[400px] w-full" />
              <Skeleton className="bg-black/10 h-4 w-3/4" />
              <Skeleton className="bg-black/10 h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="container py-16 bg-transparent px-2 md:px-12">
      <div className='flex items-center justify-between mb-2'>
        <h2 className="text-3xl font-bold">All Books</h2>
        <div className='flex'>
          <button
            className={`mr-2 h-8 w-8 border flex items-center justify-center rounded ${view === 'grid' ? 'bg-gray-200 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setView('grid')}
            title="Grid View"
          >
            <Grid className='h-6 w-6' />
          </button>
          <button
            className={`h-8 w-8 border flex items-center justify-center rounded ${view === 'list' ? 'bg-gray-200 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setView('list')}
            title="List View"
          >
            <List className='h-6 w-6' />
          </button>
        </div>
      </div>
      <div className='flex flex-col md:flex-row gap-3 h-max'>
        <BooksFilterSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories || []}
          authorFilter={authorFilter}
          setAuthorFilter={setAuthorFilter}
          uniqueAuthors={uniqueAuthors}
        />
        <LiquidGlassWrapper 
        liquidGlass={true}
        className='flex-1 rounded-lg overflow-hidden min-h-[500px] shadow pb-4 '>
          {!filteredBooks || filteredBooks.length === 0 ? (
            <div className='w-full shadow flex flex-col items-center justify-center'>
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No books found matching your search.</p>
            </div>
          ) : view === 'grid' ? (
            <BooksGridView books={filteredBooks} />
          ) : (
            <BooksListView books={filteredBooks} />
          )}
          {(total > pageSize) && (
            <div className="flex justify-center mt-8 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="px-2 py-1 text-sm">Page {page} of {Math.ceil(total / pageSize)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </LiquidGlassWrapper>
      </div>
    </section>
  );
};

export default AllBooks;