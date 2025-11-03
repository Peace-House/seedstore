import { useQuery } from '@tanstack/react-query';
import { getBooks } from '@/services/book';
import { getCategories } from '@/services/category';
import BookCard from './BookCard';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState } from 'react';
import { BookOpen, Check, Grid, List, Search } from 'lucide-react';

const AllBooks = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<(string | number)[]>([]);
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

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    // If no category selected, show all
    const matchesCategory = categoryFilter.length === 0 || (book.category && categoryFilter.includes(book.category.id));
    // Price filter
    const price = Number(book.price);
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    const matchesPrice =
      (min === null || price >= min) &&
      (max === null || price <= max);
    return matchesSearch && matchesCategory && matchesPrice;
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
      <div className='flex items-center justify-between mb-8'>
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
        {/* filter aside */}
        <div className="hidden md:flex flex-row md:flex-col gap-4 md:w-1/5 shadow p-4 rounded-md bg-white/80 max-h-[max-content] sticky top-20">
          <div className="relative ">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                onChange={e => setMinPrice(e.target.value)}
                className="w-1/2 text-xs"
              />
              <span className="text-xs text-gray-400">-</span>
              <Input
                type="number"
                min={0}
                placeholder="Max"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-1/2 text-xs"
              />
              {(minPrice || maxPrice) && (
                <button
                  className="text-xs hover:opacity-75 rounded-full bg-primary/10 px-1.5 py-0.5 ml-2"
                  onClick={() => { setMinPrice(''); setMaxPrice(''); }}
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
              {categoryFilter.length > 0 && <button className='text-xs hover:opacity-75 rounded-full bg-primary/10 px-1.5 py-0.5' onClick={() => setCategoryFilter([])}>Clear</button>}
            </div>
            {categories?.map((cat: { id: string; name: string }, idx: number) => {
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
        {!filteredBooks || filteredBooks.length === 0 ? (
          <div className='w-full shadow flex flex-col items-center justify-center'>
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No books found matching your search.</p>
          </div>
        ) : (
          <div className='flex-1 rounded-lg overflow-hidden bg-white/80 min-h-[500px] shadow pb-4 '>
            {view === 'grid' ? (
              // grid view
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5 md:gap-4 p-1 md:p-4 min-h-[90%] w-full">
              {/* <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5 md:gap-4 shadow p-1 md:p-4 rounded-md bg-white/80 min-h-[500px] w-full"> */}
                {filteredBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              // list view
              <div className="w-full rounded-md min-h-[90%]">
              {/* <div className="w-full shadow p-4 rounded-md bg-white/80 min-h-[500px]"> */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-max">
                  {filteredBooks.map((book) => (
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
          </div>
        )}
      </div>

    </section>
  );
};

export default AllBooks;
