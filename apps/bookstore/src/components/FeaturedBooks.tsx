import { useQuery } from '@tanstack/react-query';
import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import BookCard from './BookCard';
import { Skeleton } from './ui/skeleton';
import { getBooks } from '@/services/book';
import LiquidGlassWrapper from './LiquidGlassWrapper';

const FeaturedBooks = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-books'],
    queryFn: async () => {
      // Fetch more books and filter client-side for featured
      const res = await getBooks(1, 20);
  return res.books
  // return res.books.filter((b: Book) => b.featured).slice(0, 6); // Updated to show 6 featured books
    },
  });
  const books = data || [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position to enable/disable buttons
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  // Auto scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || books.length === 0) return;
    
    let direction: 'right' | 'left' = 'right';
    const interval: NodeJS.Timeout = setInterval(() => {
      if (!el) return;
      if (direction === 'right') {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) {
          direction = 'left';
        } else {
          el.scrollBy({ left: 200, behavior: 'smooth' });
        }
      } else {
        if (el.scrollLeft <= 0) {
          direction = 'right';
        } else {
          el.scrollBy({ left: -200, behavior: 'smooth' });
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [books.length]);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    return () => el.removeEventListener('scroll', checkScroll);
  }, [books.length]);

  if (isLoading) {
    return (
      <section className="container py-16 bg-white/50">
        <h2 className="text-3xl font-bold mb-2">Featured Books</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-[400px] w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!books || books.length === 0) return null;

  const featuredBooks = books.filter((book) => book.featured);
  if (featuredBooks.length === 0) return null;

  return (
    <section className="container pt-12 relative px-2 md:px-12">
      <h2 className="text-3xl font-bold mb-2">Featured Books</h2>
      <div className="relative">
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full shadow p-2 hover:bg-primary/10 transition disabled:opacity-40"
          style={{ marginLeft: '-1.5rem' }}
          onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <LiquidGlassWrapper 
        liquidGlass={true}
          ref={scrollRef}
          className="flex gap-6 py-6 px-4 shadow-sm rounded-md overflow-x-scroll scrollbar-hide scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
          {featuredBooks.map((book) => (
            <BookCard key={book.id} book={book} showActions={false} className='min-w-[180px]' />
          ))}
        </LiquidGlassWrapper>
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full shadow p-2 hover:bg-primary/10 transition disabled:opacity-40"
          style={{ marginRight: '-1.5rem' }}
          onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
          disabled={!canScrollRight}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
};

export default FeaturedBooks;
