import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { BookOpen, ShoppingCart, User, LogOut, LayoutDashboard, Home, ChevronLeft, Settings, Globe } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useCountry } from '@/hooks/useCountry';
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
  const { selectedCountry, setSelectedCountry, selectedCurrency, countryCurrencies } = useCountry();

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
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" liquidGlass={false} className='!bg-none hover:bg-transparent hover:text-black px-2 rounded-full w-max' size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side="top" 
                sideOffset={8}
                className='rounded min-w-[160px]'
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
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

          {/* Country Selector */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" liquidGlass={false} className="!bg-none flex items-center gap-1 text-xs px-2 hover:bg-transparent hover:text-black rounded-full w-max">
                <Globe className="h-4 w-4" />
                <span className="text-[10px]">{selectedCurrency}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              side="top" 
              sideOffset={8}
              className="max-h-60 overflow-y-auto rounded min-w-[160px]"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {countryCurrencies.map((cc) => (
                <DropdownMenuItem
                  key={cc.id}
                  onClick={() => setSelectedCountry(cc.country)}
                  className={selectedCountry === cc.country ? 'bg-primary/10 font-medium' : ''}
                >
                  {cc.country} ({cc.currency})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default MobileNavbar;
