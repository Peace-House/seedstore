import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeaturedBooks from '@/components/FeaturedBooks';
import AllBooks from '@/components/AllBooks';
import { useAuth } from '@/hooks/useAuth';
import MobileNavbar from '@/components/MobileNavbar';

const Index = () => {
  const { user } = useAuth();
  return (
    <div className='bg-[#8FB51C]/15 relative'>
      <Navbar />
      <div className="min-h-screen ">
        <Hero />
        {user && <div id='featured-books'>
          <FeaturedBooks />
        </div>}
        <div id='all-books'>
          <AllBooks />
        </div>
      </div>
      <MobileNavbar />
    </div>
  );
};

export default Index;
