import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeaturedBooks from '@/components/FeaturedBooks';
import AllBooks from '@/components/AllBooks';
import { useAuth } from '@/hooks/useAuth';
import MobileNavbar from '@/components/MobileNavbar';
import Footer from '@/components/Footer';
import MostReadBooks from '@/components/ui/MostRead';
import { useBooks } from '@/hooks/useBooks';
import { hasValidPricing } from '@/utils/pricing';
import { Book } from '@/services';

const Index = () => {
  const { user } = useAuth();
  const books = useBooks();

  const featuredBooks = books.data?.books?.filter((book: Book) => book.featured && hasValidPricing(book.prices));
  const booksWithPricing = books.data?.books?.filter((book: Book) => hasValidPricing(book.prices)) || [];

  return (
    <div className='bg-[#8FB51C]/15 relative'>
      <Navbar />
      <div className="min-h-screen ">
        <Hero />
        {user && <div id='featured-books' className='from-transparent via-transparent to-primary/20 bg-gradient-to-t'>
          {/* <FeaturedBooks /> */}
          <br />
          <br />
          <div className='container flex flex-col md:flex-row justify-between gap-8'>
            <MostReadBooks title='Most read' books={booksWithPricing} />
            <MostReadBooks title='Featured books' books={featuredBooks} />
          </div>
        </div>}
        <div id='all-books'>
          <AllBooks />
        </div>
      </div>
      <Footer />
      <MobileNavbar />
    </div>
  );
};

export default Index;
