import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeaturedBooks from '@/components/FeaturedBooks';
import AllBooks from '@/components/AllBooks';
import { useAuth } from '@/hooks/useAuth';
import MobileNavbar from '@/components/MobileNavbar';
import Footer from '@/components/Footer';

const Index = () => {
  const { user } = useAuth();
  return (
    <div className='bg-[#8FB51C]/15 relative'>
      <Navbar />
      <div className="min-h-screen ">
        <Hero />
        {user && <div id='featured-books' className='from-transparent via-transparent to-primary/20 bg-gradient-to-t'>
          <FeaturedBooks />
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
