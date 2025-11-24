import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { BookOpen, ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Logo from './Logo';
import { useState } from 'react';
import { useBookSearchParams } from '@/hooks/useBookSearchParams';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';

const Navbar = () => {
  const [search, setSearch] = useState('');
  const navigateTo = useNavigate();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { cartCount } = useCart();

  const isAdmin = user && (user.role === 'admin' || user.isAdmin);

  const handleSignOut = async () => {
    await signOut();
    navigate(0);
  }

  return (
    <nav className="hidden md:block sticky top-0 z-50 w-full border-b bg-transparent backdrop-blur-lg supports-[backdrop-filter]:bg-transparent">
      <div className="container flex h-16 items-center justify-between">
        <Logo withText />

        {/* Search Bar (Desktop Only) */}
        <form
          className="hidden lg:flex items-center gap-2 bg-transparent shadow-none rounded-sm w-1/2 justify-between px-3 py-1 border-none border-gray-400"
          onSubmit={e => {
            e.preventDefault();
            if (search.trim()) {
              // Pass search as URL param
              const params = new URLSearchParams();
              // If input is a price range (e.g. 10-50), set priceMin/priceMax
              const priceRangeMatch = search.match(/^(\d+)(\s*-\s*(\d+))?$/);
              if (priceRangeMatch) {
                const min = parseFloat(priceRangeMatch[1]);
                const max = priceRangeMatch[3] ? parseFloat(priceRangeMatch[3]) : undefined;
                if (!isNaN(min)) params.set('priceMin', String(min));
                if (!isNaN(max)) params.set('priceMax', String(max));
              }
              params.set('title', search);
              params.set('author', search);
              params.set('category', search);
              navigateTo(`/search?${params.toString()}`);
            }
          }}
        >
          <Input
            type="text"
            className="bg-transparent flex-1 outline-none !shadow px-2 py-1 text-gray-900 placeholder:text-gray-600 w-40 rounded-full"
            placeholder="Search books by title, author, category, or price (e.g. 10-50)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="ml-0.5 px-4 py-2  bg-primary text-white hover:bg-primary/90 text-sm font-semibold rounded-full"
          >
            Search
          </button>
          { search && <button
            type="button"
            className="ml-1 px-2 py-1 rounded text-gray-500 hover:text-black text-xs"
            onClick={() => {
              setSearch('');
              navigateTo('/search');
            }}
          >
            Clear
          </button>}
        </form>

        <div className="flex items-center gap-4 space-x-3">
          {user&&<Link to="/library" className='relative flex gap-3 items-center'>
              <BookOpen className="h-5 w-5" />
              <span className='hidden md:block'>
              My Library
              </span>
          </Link>}
          <Link to="/cart" className='relative flex gap-3 items-center'>
              <ShoppingCart className="h-5 w-5" />
              <span className='hidden md:block'>
              Cart
              </span>
              {cartCount > 0 && (
                <Badge className="absolute -top-2.5 left-2.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {cartCount}
                </Badge>
              )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className='hover:bg-transparent px-2 rounded-full hover:text-black w-max' size="icon">
                  <User className="h-5 w-5" />
                  <span className='hidden md:block'>Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent  align="end" className='rounded'>
                <DropdownMenuItem onClick={() => navigate('/library')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  My Library
                </DropdownMenuItem>
                {user.role !== 'user' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className='text-red-500'>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
