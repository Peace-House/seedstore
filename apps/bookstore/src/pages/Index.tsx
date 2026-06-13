import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeaturedBooks from '@/components/FeaturedBooks';
import AllBooks from '@/components/AllBooks';
import { useAuth } from '@/hooks/useAuth';
import MobileNavbar from '@/components/MobileNavbar';
import Footer from '@/components/Footer';
import MostReadBooks from '@/components/ui/MostRead';
import StickyAppDownload from '@/components/StickyAppDownload';
import { PageLoader } from '@/components/Loader';
import { useBooks, useFeaturedBooks } from '@/hooks/useBooks';
import { hasValidPricing } from '@/utils/pricing';
import { Book } from '@/services';

const Index = () => {
  const { user, token, loading } = useAuth();
  const books = useBooks();
  // Dedicated server-side fetch of every featured book. Replaces the
  // previous client-side `books.filter(b.featured)` which only ever
  // saw the first page of /books and silently dropped any featured
  // book that lived on page 2+.
  const featured = useFeaturedBooks();

  // While we have a stored token but /me hasn't resolved yet, render a loader
  // instead of the visitor variant of the landing page — avoids the visible
  // flash of the !user UI before the authed UI hydrates.
  if (token && loading && !user) {
    return <PageLoader />;
  }

  const featuredBooks = featured.data?.books?.filter((book: Book) => hasValidPricing(book.prices));
  const booksWithPricing = books.data?.books?.filter((book: Book) => hasValidPricing(book.prices)) || [];

  return (
    <div className='bg-[#8FB51C]/15 relative'>
      {/* Mobile-only sticky download CTA — slides in from the top once
          the user scrolls past the inline AppDownload in the Hero so
          the install affordance stays one tap away no matter where
          they are on the landing page. Hidden on md+ where the
          desktop Navbar occupies the same screen real estate. */}
      <StickyAppDownload />
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
