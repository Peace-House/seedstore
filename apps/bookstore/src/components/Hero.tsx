import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from './ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from './ui/carousel'
import { useAuth } from '@/hooks/useAuth'
import { useBooks } from '@/hooks/useBooks'
// import { useCountry } from '@/hooks/useCountry';
import {
  // getBookPriceForCountry,
  hasValidPricing,
} from '@/utils/pricing'
// import { truncate } from '@/lib/utils';
import { Book } from '@/services'
import AppDownload from './AppDownload'
import FeaturedBooks from './FeaturedBooks'
import { Skeleton } from './ui/skeleton'

const Hero = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [heroCarouselApi, setHeroCarouselApi] = useState<CarouselApi>()
  // const { selectedCountry, countryCurrencies } = useCountry();

  const books = useBooks()

  // Get the two most recent new release books, sorted by publishedDate (most recent first)
  // Only show books with valid pricing
  // const newReleaseBooks = books?.data?.books
  //   ?.filter((book: Book) => book.isNewRelease && hasValidPricing(book.prices))
  //   ?.sort((a: Book, b: Book) => {
  //     const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
  //     const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
  //     return dateB - dateA; // Most recent first
  //   })
  //   ?.slice(0, 2) || [];

  // Filter books with valid pricing for "Most read" section
  const booksWithPricing =
    books?.data?.books?.filter((book: Book) => hasValidPricing(book.prices)) ||
    []

  const heroSlides = [
    {
      id: 'hero-stats',
      coverImage: '/bg-cross-new.jpg',
      title: books.isLoading ? (
        <Skeleton className="mx-auto h-12 w-40 md:h-20 md:w-64" />
      ) : books?.data?.total ? (
        `${books.data.total.toLocaleString()}+`
      ) : null,
      heading: 'Christian eBooks Available',
      imageOnly: false,
    },
    {
      id: 'now-live',
      coverImage: '/banner.jpeg',
      title: ``,
      heading: '',
      imageOnly: true,
    },
  ]

  const totalSlides = heroSlides.length

  useEffect(() => {
    if (!heroCarouselApi) {
      return
    }

    const autoplay = window.setInterval(() => {
      if (heroCarouselApi.canScrollNext()) {
        heroCarouselApi.scrollNext()
        return
      }

      heroCarouselApi.scrollTo(0)
    }, 4500)

    return () => {
      window.clearInterval(autoplay)
    }
  }, [heroCarouselApi])

  return (
    <section className="to-primary/20 relative overflow-hidden bg-gradient-to-b from-transparent via-transparent">
      <div className="px-2 md:container md:py-12 lg:py-12">
        <div className="mt-3 grid items-center md:mt-0 md:gap-12 lg:grid-cols-2">
          <div className="space-y-6 md:space-y-8">
            <h1 className=" text-4xl font-bold leading-tight md:block md:text-5xl lg:text-[42px]">
              Strengthen Your walk with God
              <span className="from-primary to-accent block bg-gradient-to-r bg-clip-text text-transparent">
                With your next read.
              </span>
            </h1>

            <AppDownload />

            {/* no auth */}
            {!user && (
              <p className="text-muted-foreground max-w-lg text-sm">
                Access Inspired and edifying ebooks from the Livingseed
                Publishing Team. Read anytime online and offline.
                <br />
                Enhance your reading journey today.
              </p>
            )}
            {user ? (
              <FeaturedBooks />
            ) : (
              <div className="my-8 grid grid-cols-1 flex-wrap gap-4 md:flex">
                <Button
                  size="lg"
                  liquidGlass={false}
                  className="group"
                  onClick={() => navigate('/auth')}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="hidden md:block"
                  onClick={() => {
                    const el = document.getElementById('all-books')
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' })
                    } else {
                      window.location.href = '/#all-books'
                    }
                  }}
                >
                  Browse Collection
                </Button>
              </div>
            )}
          </div>
          {/* not auth */}
          {
            <div className="relative h-[320px] overflow-hidden rounded-2xl shadow-2xl md:h-[420px] lg:h-[500px]">
              <Carousel
                setApi={setHeroCarouselApi}
                opts={{ align: 'start', loop: totalSlides > 1 }}
                className="h-full"
              >
                <CarouselContent className="ml-0 h-[320px] md:h-[420px] lg:h-[500px]">
                  {heroSlides.map((slide) => (
                    <CarouselItem
                      key={slide.id}
                      className="h-[320px] pl-0 md:h-[420px] lg:h-[500px]"
                    >
                      <div className="relative h-full overflow-hidden">
                        {slide.imageOnly ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/5 p-1 md:p-2">
                            <img
                              src={slide.coverImage}
                              alt="Promotional banner"
                              className="object-scale-up rounded-lg object-top shadow-lg"
                              style={{
                                height: '500px',
                                width: '100%',
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center md:items-end md:justify-end"
                            style={{
                              backgroundImage: `url(${slide.coverImage})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'left',
                              backgroundRepeat: 'no-repeat',
                            }}
                          >
                            <div className="text-primary space-y-4 p-8 text-center">
                              <div className="text-3xl font-bold md:text-8xl">
                                {slide.title}
                              </div>
                              <div className="text-2xl">{slide.heading}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* {totalSlides > 1 && (
                <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur-sm">
                  {Array.from({ length: totalSlides }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Go to slide ${index + 1}`}
                      className={`h-2.5 w-2.5 rounded-full transition ${
                        currentSlide === index ? 'bg-white' : 'bg-white/40'
                      }`}
                      onClick={() => heroCarouselApi?.scrollTo(index)}
                    />
                  ))}
                </div>
              )} */}
            </div>
          }
          {/* with auth - show two most recent new releases */}
          {/* {user && newReleaseBooks.length > 0 && (
            <div className="hidden h-full md:grid grid-cols-1 md:grid-cols-2 px-6 items-center justify-center gap-6 z-10 relative bg-transparent lg:h-[500px] rounded-2xl overflow-hidden shadow-none">
              {newReleaseBooks.map((book: Book) => {
                const priceInfo = getBookPriceForCountry(book.prices, selectedCountry, 'soft_copy', countryCurrencies);
                return (
                  <div key={book.id} className="bg-white/90 h-[89%] w-full rounded-xl shadow-md border overflow-hidden flex flex-col items-center relative">
                    <div className="absolute top-1 right-1 rounded-lg bg-red-600 italic text-white px-2 py-1 text-xs font-semibold">
                      New
                    </div>
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="h-[90%] w-full object-cover mb-3 shadow"
                    /><div className="text-sm font-bold text-gray-600 text-left line-clamp-1 w-full px-4">
                      {priceInfo.symbol}{Number(priceInfo.price).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )} */}
        </div>
      </div>
    </section>
  )
}

export default Hero
