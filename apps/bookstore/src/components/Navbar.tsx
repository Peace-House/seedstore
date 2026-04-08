import { Link } from 'react-router-dom'
import { Button } from './ui/button'
import {
  BookOpen,
  ShoppingCart,
  User,
  LogOut,
  LayoutDashboard,
  Globe,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useCountry } from '@/hooks/useCountry'
import { Badge } from './ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import Logo from './Logo'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Input } from './ui/input'

const Navbar = () => {
  const [search, setSearch] = useState('')
  const navigateTo = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { cartCount } = useCart()
  const {
    selectedCountry,
    selectedCurrency,
    countryCurrencies,
    setSelectedCountry,
  } = useCountry()

  const isAdmin = user && (user.role === 'admin' || user.isAdmin)
  const isCheckoutPage = location.pathname.startsWith('/checkout')

  const handleSignOut = async () => {
    await signOut()
    navigate(0)
  }

  return (
    <nav className="supports-[backdrop-filter]:bg-transparent sticky top-0 z-50 hidden w-full border-b bg-transparent backdrop-blur-lg md:block">
      <div className="container flex h-16 items-center justify-between">
        <Logo withText />

        {/* Search Bar (Desktop Only) */}
        <form
          className="hidden w-2/5 items-center justify-between gap-2 rounded-sm border-none border-gray-400 bg-transparent px-3 py-1 shadow-none lg:flex"
          onSubmit={(e) => {
            e.preventDefault()
            if (search.trim()) {
              // Pass search as URL param
              const params = new URLSearchParams()
              // If input is a price range (e.g. 10-50), set priceMin/priceMax
              const priceRangeMatch = search.match(/^(\d+)(\s*-\s*(\d+))?$/)
              if (priceRangeMatch) {
                const min = parseFloat(priceRangeMatch[1])
                const max = priceRangeMatch[3]
                  ? parseFloat(priceRangeMatch[3])
                  : undefined
                if (!isNaN(min)) params.set('priceMin', String(min))
                if (!isNaN(max)) params.set('priceMax', String(max))
              }
              params.set('title', search)
              params.set('author', search)
              params.set('category', search)
              navigateTo(`/search?${params.toString()}`)
            }
          }}
        >
          <Input
            type="text"
            className="w-40 flex-1 rounded-full bg-transparent px-2 py-1 indent-2 text-gray-900 !shadow outline-none placeholder:text-[11px] placeholder:text-gray-600"
            placeholder="Search books by title, author, category, or price (e.g. 10-50)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 ml-0.5  rounded-full px-4 py-2 text-xs font-semibold text-white"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              className="ml-1 rounded px-2 py-1 text-xs text-gray-500 hover:text-black"
              onClick={() => {
                setSearch('')
                navigateTo('/search')
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 space-x-2">
          {user && (
            <Link to="/library" className="relative flex items-center gap-3">
              <BookOpen className="h-5 w-5" />
              <span className="hidden w-max text-xs md:block">My Library</span>
            </Link>
          )}
          <Link to="/cart" className="relative flex items-center gap-3">
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden w-max text-xs md:block">Cart</span>
            {cartCount > 0 && (
              <Badge className="absolute -top-2.5 left-2.5 flex h-5 w-5 items-center justify-center p-0 text-xs">
                {cartCount}
              </Badge>
            )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-max rounded-full px-2 hover:bg-transparent hover:text-black"
                  size="icon"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden w-max text-xs md:block">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded">
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/manage-group-buy')}>
                  <User className="mr-2 h-4 w-4" />
                  Manage Group Buy
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
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              liquidGlass={false}
              className="text-xs"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          )}
          {!isCheckoutPage && (
            <>
              {/* separator */}
              <div className="h-6 border-l border-gray-300"></div>
              {/* Country Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex w-max items-center gap-1 rounded-full px-2 text-xs hover:bg-transparent hover:text-black"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="text-[10px]">{selectedCountry}</span>
                    <span className="text-muted-foreground text-[10px]">
                      ({selectedCurrency})
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-60 overflow-y-auto rounded"
                >
                  {countryCurrencies.map((cc) => (
                    <DropdownMenuItem
                      key={cc.id}
                      onClick={() => setSelectedCountry(cc.country)}
                      className={
                        selectedCountry === cc.country
                          ? 'bg-primary/10 font-medium'
                          : ''
                      }
                    >
                      {cc.country} ({cc.currency})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
