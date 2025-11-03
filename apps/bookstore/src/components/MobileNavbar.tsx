import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { BookOpen, ShoppingCart, User, LogOut, LayoutDashboard, Home, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Badge } from './ui/badge';
// ...existing code...
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const MobileNavbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();

  const isAdmin = user && (user.role === 'admin' || user.isAdmin);

  const handleSignOut = async () => {
    await signOut();
    navigate(0);
  };

  return (
    <nav className="md:hidden fixed bottom-0 z-50 w-full bg-transparent backdrop-blur supports-[backdrop-filter]:bg-transparent">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center justify-between w-full">
          {location.pathname !== '/' && (
            <button onClick={()=>navigate(-1)} className='relative flex gap-3 items-center'>
                <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/library" className='relative flex gap-3 items-center'>
              <BookOpen className="h-5 w-5" />
          </Link>
          <Link to="/cart" className='relative flex gap-3 items-center'>
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-2.5 left-2.5 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {cartCount}
                </Badge>
              )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className='hover:bg-transparent hover:text-black w-max' size="icon">
                  <User className="h-5 w-5" />
                  <span className='hidden md:block'>Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent  align="end">
                <DropdownMenuItem onClick={() => navigate('/library')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  My Library
                </DropdownMenuItem>
                {/* {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )} */}
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

export default MobileNavbar;
