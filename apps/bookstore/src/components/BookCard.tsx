import { Card, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { ShoppingCart, Eye, Download } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import { capitalizeWords, slugify, truncate } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import { useLibrary } from '@/hooks/useLibrary';
import { useCountry } from '@/hooks/useCountry';
import { getBookPriceForCountry } from '@/utils/pricing';
import { Book } from '@/services';
import LiquidGlassWrapper from './LiquidGlassWrapper';


interface BookCardProps {
  book: Book;
  listView?: boolean;
  showActions?: boolean;
  className?: string;
}
const reader_route = import.meta.env.VITE_BOOKREADER_URL!
const BookCard = ({ book, listView, showActions = true, className }: BookCardProps) => {
  // Helper to get orderId for purchased book
  const getOrderId = () => {
    if ((book as Book).orderId) return (book as Book).orderId;
    const purchased = purchasedBooks.find((b) => b.id === book.id);
    return purchased && (purchased as Book).orderId ? (purchased as Book).orderId : '';
  };
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart, isAddingToCart, cartItems } = useCart();
  const { library: purchasedBooks } = useLibrary();
  const { selectedCountry, countryCurrencies } = useCountry();

  // Get price for selected country
  const priceData = getBookPriceForCountry(book.prices, selectedCountry, 'soft_copy', countryCurrencies);
  const displayPrice = priceData?.price ?? book.price ?? 0;
  const displaySymbol = priceData?.symbol ?? '₦';

  const isPurchased = Array.isArray(purchasedBooks)
    ? purchasedBooks.some((b) => b.id === book.id)
    : false;
  // Check if book is already in cart
  const isInCart = Array.isArray(cartItems)
    ? cartItems.some((item) => (item.book?.id || item.id) === book.id)
    : false;

  const handleAddToCart = () => {
    addToCart(book, {
      // addToCart(book.id, {
      onSuccess: () => {
        toast({
          title: 'Added to cart',
          description: `${book.title} has been added to your cart.`,
        });
      },
      onError: () => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to add item to cart. Please try again.',
        });
      },
    });
  };

  const handleDownload = () => {
    const url = book.fileUrl;
    if (!url) {
      toast({
        variant: 'destructive',
        title: 'Download unavailable',
        description: 'No file available for this book.',
      });
      return;
    }
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = book.title + '.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Download started',
      description: `Downloading ${book.title}.`,
    });
  };

  const handleReadNow = (bookId: string) => {
    const token = localStorage.getItem('auth_token');
    const url = `${reader_route}?bookId=${bookId}&orderId=${getOrderId()}${token ? `&auth_token=${encodeURIComponent(token)}` : ''}`;
    window.location.href = url;
  }

  if (listView) {
    return (
      <LiquidGlassWrapper className="flex flex-row items-center !bg-white/70 rounded-md justify-between gap-2 border-none hover:shadow-md h-max shadow-none w-full overflow-hidden">
        {/* Cover Image */}
        <div className="w-24 h-32 flex-shrink-0 bg-muted  overflow-hidden">
          {book.coverImage ? (
            <Link to={`/book/${book.id}`}>
              <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
            </Link>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-2xl font-bold text-muted-foreground">{book.title[0]}</span>
            </div>
          )}
        </div>

        {/* Actions: Cart/Read/Details */}
        <div className="flex flex-col justify-between h-32 p-1 flex-1 gap-2 items-end">
          {/* Book Info */}
          <div className="flex-1 min-w-0 w-full">
            <Link to={`/book/${book.id}`}>
              <h3 className="font-semibold text-xs truncate hover:underline">{truncate(book.title, 20)}</h3>
            </Link>
            <p className="text-muted-foreground text-xs truncate">{capitalizeWords(book.author)}</p>
            <div className="flex items-center gap-2 mt-2">
              {book.category?.name && (
                <span className="px-2 py-0.5 text-xs rounded bg-muted-foreground/10 text-muted-foreground">{book.category.name}</span>
              )}
              {book.format && (
                <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">{book.format.toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between w-full">
            <span className="text-primary font-bold">{displaySymbol}{Number(displayPrice).toLocaleString()}</span>

            {isPurchased ? (
              <Button
                size="sm"
                variant="outline"
                className='border-none'
                onClick={() => handleReadNow(book.id as string)}

              >
                <BookOpen className="h-4 w-4" />
                {/* Read Now */}
              </Button>
            ) : displayPrice === 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                disabled={isAddingToCart}
                className='border-none'

              >
                <Download className=" h-4 w-4" />
                {/* Download */}
              </Button>
            ) : isInCart ? (
              <Button size="sm"
                className='border-none'
              
              disabled variant="outline"
              >
                <ShoppingCart className=" h-4 w-4" />
                {/* Added to Cart */}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                variant="outline"
                className='border-none'
              >
                <ShoppingCart className="h-4 w-4" />
                {/* Add to Cart */}
              </Button>
            )}
          </div>
        </div>
      </LiquidGlassWrapper>
    );
  }
  return (
    <LiquidGlassWrapper className={`overflow border-none !bg-white/70  overflow-hidden transition-shadow group h-max md:min-w-[180px] ${className}`}>
      <div className="relative overflow-hidden bg-muted flex-1 w-full">
        {book.coverImage ? (
          <div className='relative h-[220px] w-full md:w-[200px] overflow-hidden'>
            <img
              src={book.coverImage}
              alt={book.title}
              className="object-fill w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <span className="text-4xl font-bold text-muted-foreground">
              {book.title[0]}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/book/${slugify(book.title)}-${book.id}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
        {book.category && (
          <LiquidGlassWrapper className="inline-block !shadow-lg text-xs px-2 py-1 bg-white/60 text-primary rounded-full !absolute right-1 top-1 z-10">
            {book.category?.name}
          </LiquidGlassWrapper>
        )}
      </div>
      <div className='h-max-[150px] flex flex-col justify-between'>
        <CardContent className="p-2 bg-none">
          {/* <h3 className="text-xs font-semibold line-clamp-2 mb-1">{truncate(book.title, 21)}</h3> */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground capitalize">{capitalizeWords(book.author)}</p>
          </div>
        </CardContent>

        <CardFooter className="p-2 bg-none pt-0 flex items-center justify-between">
          <span className="text-sm font-bold text-primary">
            {
              displayPrice === 0 ? 'Free' : `${displaySymbol}${Number(displayPrice).toLocaleString()}`
            }
          </span>
          {
            showActions === true ?
              isPurchased ? (
                <Button
                  size="sm"
                  variant="outline"
                  liquidGlass
                  onClick={() => handleReadNow(book.id as string)}
                  style={{ inset: '-10px 20px 30px -40px' }}

                  className='text-xs gap-0  max-[768px]:h-max py-1 px-1.5 rounded-full'
                >
                  <BookOpen className="mr-1 h-4 w-4 hidden md:block" />
                  Read Now
                </Button>
              ) : displayPrice === 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isAddingToCart}
                  style={{ inset: '10px 20px 30px 40px' }}
                  className='text-xs gap-0 max-[768px]:h-max py-1 px-1.5 rounded-full'
                >
                  {/* <Download className="mr-2 h-4 w-4" />
                  <span className='hidden md:block'>
                    Download
                  </span> */}
                  <BookOpen className="mr-1 h-4 w-4 hidden md:block" />
                  Read Now
                </Button>
              ) : isInCart ? (
                <Button
                  size="sm"
                  disabled
                  variant="outline"
                  className='text-[11px] gap-0 max-[768px]:h-max py-1 px-1.5 rounded-full'
                >
                  <ShoppingCart className="hidden md:block mr-1 h-4 w-4" />
                  <span className=''>
                    Added to Cart
                  </span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className='text-xs gap-0 max-[768px]:h-max py-1 px-1.5 rounded-full'
                >
                  <ShoppingCart className="hidden md:block mr-1 h-4 w-4" />
                  <span className=''>
                    Add to Cart
                  </span>
                </Button>
              )
              : null

          }
        </CardFooter>
      </div>
    </LiquidGlassWrapper>
  );
};

export default BookCard;
