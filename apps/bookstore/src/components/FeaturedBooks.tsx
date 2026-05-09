import { useQuery } from '@tanstack/react-query'
import { useRef, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import BookCard from './BookCard'
import { Skeleton } from './ui/skeleton'
import { Book, getBooks } from '@/services/book'
import LiquidGlassWrapper from './LiquidGlassWrapper'
import { hasValidPricing } from '@/utils/pricing'
import { useBooks } from '@/hooks/useBooks'

const FeaturedBooks = () => {
  // const { data, isLoading } = useQuery({
  //   queryKey: ['featured-books'],
  //   queryFn: async () => {
  //     // Fetch more books and filter client-side for featured
  //     const res = await getBooks(1, 20);
  //     return res.books
  //     // return res.books.filter((b: Book) => b.featured).slice(0, 6); // Updated to show 6 featured books
  //   },
  // });
  const booksData = useBooks(1, 50)
  // const books = data || [];
  const books =
    booksData.data?.books?.filter((book: Book) => book.isNewRelease) || []

  console.log(books)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll position to enable/disable buttons
  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  // Auto scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el || books.length === 0) return

    let direction: 'right' | 'left' = 'right'
    const interval: NodeJS.Timeout = setInterval(() => {
      if (!el) return
      if (direction === 'right') {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) {
          direction = 'left'
        } else {
          el.scrollBy({ left: 200, behavior: 'smooth' })
        }
      } else {
        if (el.scrollLeft <= 0) {
          direction = 'right'
        } else {
          el.scrollBy({ left: -200, behavior: 'smooth' })
        }
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [books.length])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll)
    return () => el.removeEventListener('scroll', checkScroll)
  }, [books.length])

  if (booksData.isLoading) {
    return (
      <section className="container bg-white/50 py-16">
        <h2 className="mb-2 text-3xl font-bold">New Books</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-[400px] w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (!books || books.length === 0) return null

  // Filter for featured books with valid pricing
  // const featuredBooks = books.filter((book) => book.featured && hasValidPricing(book.prices));
  // if (featuredBooks.length === 0) return null;

  return (
    <section className="container relative px-2 pt-0">
      <h2 className="mb-2 text-3xl font-bold">New Books</h2>
      <div className="relative">
        <button
          className="hover:bg-primary/10 absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow transition disabled:opacity-40"
          style={{ marginLeft: '-1.5rem' }}
          onClick={() =>
            scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })
          }
          disabled={!canScrollLeft}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <LiquidGlassWrapper
          liquidGlass={true}
          ref={scrollRef}
          className="scrollbar-hide flex gap-6 overflow-x-scroll scroll-smooth rounded-md py-6 px-4 shadow-sm"
          style={{ scrollBehavior: 'smooth' }}
        >
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              showActions={false}
              className="min-w-[180px]"
            />
          ))}
        </LiquidGlassWrapper>
        <button
          className="hover:bg-primary/10 absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow transition disabled:opacity-40"
          style={{ marginRight: '-1.5rem' }}
          onClick={() =>
            scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })
          }
          disabled={!canScrollRight}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  )
}

export default FeaturedBooks
