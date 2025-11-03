
import { useEffect, useState } from 'react';
import { useBookSearchParams } from '@/hooks/useBookSearchParams';
import { getBooks, Book } from '@/services/book';
import { getCategories } from '@/services/category';
import BookCard from '@/components/BookCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, Check, Grid, List, Search, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const BookSearchPage = () => {
  const { params } = useBookSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(params.title || '');
  const [categoryFilter, setCategoryFilter] = useState<(string | number)[]>(params.category ? [params.category] : []);
  const [minPrice, setMinPrice] = useState(params.priceMin ? String(params.priceMin) : '');
  const [maxPrice, setMaxPrice] = useState(params.priceMax ? String(params.priceMax) : '');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const pageSize = 12;

  useEffect(() => {
    const fetchBooksAndCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookRes, catRes] = await Promise.all([
          getBooks(1, 100),
          getCategories(),
        ]);
        setCategories(catRes);
        setBooks(bookRes.books);
      } catch (err) {
        setError((err as Error).message || 'Failed to fetch books');
      } finally {
        setLoading(false);
      }
    };
    fetchBooksAndCategories();
  }, []);

  // Filtering logic (client-side)
  const filteredBooks = books.filter(book => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      categoryFilter.length === 0 || (book.category && categoryFilter.includes(book.category.id));
    const price = Number(book.price);
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    const matchesPrice =
      (min === null || price >= min) &&
      (max === null || price <= max);
    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Pagination
  const total = filteredBooks.length;
  const paginatedBooks = filteredBooks.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="container py-16 bg-transparent px-2 md:px-12">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center text-sm text-muted-foreground gap-2" aria-label="Breadcrumb">
        <Link to="/" className="hover:underline flex items-center gap-1">
          <Home className="w-4 h-4" /> Home
        </Link>
        <span className="mx-1">/</span>
        <span className="text-primary font-semibold">Search Results</span>
      </nav>
      <div className='flex items-center justify-between mb-8'>
        <h2 className="text-3xl font-bold">Search Results</h2>
        <div className='flex'>
          <button
            className={`mr-2 h-10 w-10 border flex items-center justify-center rounded ${view === 'grid' ? 'bg-gray-200 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setView('grid')}
            title="Grid View"
          >
            <Grid className='h-8 w-8' />
          </button>
          <button
            className={`h-10 w-10 border flex items-center justify-center rounded ${view === 'list' ? 'bg-gray-200 text-primary' : 'text-muted-foreground'}`}
            onClick={() => setView('list')}
            title="List View"
          >
            <List className='h-8 w-8' />
          </button>
        </div>
      </div>
      <div className='flex flex-col md:flex-row gap-3 h-max'>
        {/* filter aside */}
        <div className="hidden md:flex flex-row md:flex-col gap-4 md:w-1/5 shadow p-4 rounded-md bg-white/80 max-h-[max-content]">
          <div className="relative ">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search title or author..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-7 placeholder:text-xs"
            />
          </div>
          {/* Price Range Filter */}
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-xs text-gray-500 font-medium">PRICE RANGE</label>
            <div className="flex gap-2 items-center justify-between">
              <Input
                type="number"
                min={0}
                placeholder="Min"
                value={minPrice}
                onChange={e => { setMinPrice(e.target.value); setPage(1); }}
                className="w-1/2 text-xs"
              />
              <span className="text-xs text-gray-400">-</span>
              <Input
                type="number"
                min={0}
                placeholder="Max"
                value={maxPrice}
                onChange={e => { setMaxPrice(e.target.value); setPage(1); }}
                className="w-1/2 text-xs"
              />
              {(minPrice || maxPrice) && (
                <button
                  className="text-xs hover:opacity-75 rounded-full bg-primary/10 px-1.5 py-0.5 ml-2"
                  onClick={() => { setMinPrice(''); setMaxPrice(''); setPage(1); }}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <hr className="md:my-0 my-2" />
          {/* categories filter */}
          <ul className='grid'>
            <div className='flex items-center justify-between'>
              <p className='text-gray-500'>CATEGORIES</p>
              {categoryFilter.length > 0 && <button className='text-xs hover:opacity-75 rounded-full bg-primary/10 px-1.5 py-0.5' onClick={() => { setCategoryFilter([]); setPage(1); }}>Clear</button>}
            </div>
            {categories?.map((cat, idx) => {
              const catId = cat.id || 'uncategorized';
              const isSelected = categoryFilter.includes(catId);
              return (
                <li
                  key={idx}
                  onClick={() => {
                    setCategoryFilter(prev =>
                      isSelected
                        ? prev.filter(id => id !== catId)
                        : [...prev, catId]
                    );
                    setPage(1);
                  }}
                  className={`py-1 px-2 text-sm cursor-pointer hover:bg-muted-foreground/10 transition-colors ${isSelected ? 'font-semibold' : ''}`}
                >
                  {cat.name || 'Uncategorized'} {isSelected && <Check className='inline-block w-3 h-3 text-muted-foreground' />}
                </li>
              );
            })}
          </ul>
        </div>

        {/* No books found message */}
        {!paginatedBooks || paginatedBooks.length === 0 ? (
          <div className='w-full shadow flex flex-col items-center justify-center'>
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No books found matching your search.</p>
          </div>
        ) : (
          <>
            {view === 'grid' ? (
              // grid view
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5 md:gap-4 shadow p-1 md:p-4 rounded-md bg-white/80 min-h-[500px] w-full">
                {paginatedBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              // list view
              <div className="w-full shadow p-4 rounded-md bg-white/80 min-h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-max">
                  {paginatedBooks.map((book) => (
                    <BookCard key={book.id} book={book} listView />
                  ))}
                </div>
              </div>
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
          </>
        )}
      </div>
    </section>
  );
};

export default BookSearchPage;
