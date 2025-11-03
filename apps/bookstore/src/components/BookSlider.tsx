import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import BookCard from './BookCard';
import { Book } from '@/services/book';

interface BookSliderProps {
  books: Book[];
  autoScroll?: boolean;
  title?: string;
    showActions?: boolean;
}

const BookSlider = ({ books, autoScroll = false, title, showActions }: BookSliderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    return () => el.removeEventListener('scroll', checkScroll);
  }, [books.length]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el || books.length === 0) return;
    let direction: 'right' | 'left' = 'right';
    const interval = setInterval(() => {
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
    }, 2500);
    return () => clearInterval(interval);
  }, [autoScroll, books.length]);

  if (!books || books.length === 0) return null;

  return (
    <div className="relative mt-8 bg-white rounded-lg py-2">
      {title && <h2 className="text-2xl font-bold mb-4 px-4">{title}</h2>}
      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full shadow p-2 hover:bg-primary/10 transition disabled:opacity-40"
        style={{ marginLeft: '-1.5rem' }}
        onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
        disabled={!canScrollLeft}
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <div
        ref={scrollRef}
        className="flex gap-6 bg-white/50 px-4 p-2 shadow-sm rounded overflow-x-scroll scrollbar-hide scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {books.map((book) => (
          <BookCard key={book.id} book={book} showActions={showActions} />
        ))}
      </div>
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
  );
};

export default BookSlider;
