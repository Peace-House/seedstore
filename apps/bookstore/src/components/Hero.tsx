import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from './ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useBooks } from '@/hooks/useBooks';
import { truncate } from '@/lib/utils';
import { Book } from '@/services';

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const books = useBooks();

  return (
    <section className="relative overflow-hidden">
      <div className="container py-6 md:py-12 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 h-4/5 mt-auto">
            <h1 className="hidden md:block text-5xl lg:text-6xl font-bold leading-tight">
              Discover Your Next
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Favorite Read
              </span>
            </h1>
            {/* no auth */}
            {!user && <p className="text-xl text-muted-foreground max-w-lg">
              Access thousands of Christian eBooks. Read anytime. Start your reading journey today.
            </p>}
            {user ?
              <div className='w-full h-1/2'>
                <p className='font-medium mb-1'>Most read</p>
                <ul className='overflow-x-auto scroll-smooth custom-scrollbar flex gap-2 w-full h-full px-1'>
                  {books?.data?.books?.map((book: Book) => (
                <li key={book.id} className="bg-white/90 h-full min-w-[150px] max-w-[250px] border border-gray-200 rounded-none shadow-lg flex flex-col items-center">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="h-full w-[150px] object-cover mb-3"
                  />
                  {/* <div className="text-[10px] mb-1 text-gray-600 font-semibold text-center line-clamp-1">{book.author}</div> */}
                </li>
              ))}

                </ul>
              </div>
              :
              (
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="group" onClick={() => navigate('/auth')}>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      const el = document.getElementById('all-books');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        window.location.href = '/#all-books';
                      }
                    }}
                  >
                    Browse Collection
                  </Button>
                </div>
              )
            }
          </div>
          {/* not auth */}
          {!user && <div className="relative lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-90" />
            <div className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundImage: 'url(/public/cross.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div className="text-center text-white space-y-4 p-8">
                <div className="text-6xl font-bold">10,000+</div>
                <div className="text-xl">Christian eBooks Available</div>
              </div>
            </div>
          </div>}
          {/* with auth */}
          {user && books?.data && books?.data?.books && books?.data?.books?.length > 0 && (
            <div className="h-full grid grid-cols-2 px-6 items-center justify-center gap-6 z-10 relative bg-transparent lg:h-[500px] rounded-2xl overflow-hidden shadow-none">
              {books.data.books.slice(0, 2).map((book: Book) => (
                <div key={book.id} className="bg-white/90 h-[89%] w-full rounded-xl shadow-md border overflow-hidden flex flex-col items-center relative">
                  <div className="absolute top-1 right-1 rounded-lg bg-red-600 italic text-white px-2 py-1 text-xs font-semibold">
                    New
                  </div>
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="h-[80%] w-full object-cover mb-3 shadow"
                  />
                  <div className="font-semibold text-lg text-gray-900 text-center line-clamp-2">{truncate(book.title, 18)}</div>
                  <div className="text-sm text-gray-600 text-center line-clamp-1">{book.author}</div>
                  <div className="text-sm font-bold text-gray-600 text-center line-clamp-1">₦{book.price}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
