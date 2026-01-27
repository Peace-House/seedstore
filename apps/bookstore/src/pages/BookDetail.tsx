import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBookById } from '@/services/book';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useCountry } from '@/hooks/useCountry';
import { getBookPriceForCountry } from '@/utils/pricing';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, BookOpen, Loader2, Calendar, FileText, Hash, ChevronLeft, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import RelatedBooks from '@/components/RelatedBooks';
import Breadcrumb from '@/components/Breadcrumb';
import { PageLoader } from '@/components/Loader';
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper';
import { useLibrary } from '@/hooks/useLibrary';

const reader_route = import.meta.env.VITE_BOOKREADER_URL!;

const BookDetail = () => {
  const { id: slugId } = useParams();
  // Extract id from slug-id
  const id = slugId?.split('-').pop();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart, isAddingToCart, cartItems } = useCart();
  const { selectedCountry, countryCurrencies } = useCountry();
  const { addFreeBookAsync, isAddingFreeBook, library } = useLibrary();

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      if (!id) return null;
      return await getBookById(id);
    },
  });

  // Check if book is in user's library (purchased or added as free)
  const isPurchased = book && Array.isArray(library)
    ? library?.some((b) => b.id == book.id)
    : false;

  // Helper to get orderId for purchased book
  const getOrderId = () => {
    if (book?.orderId) return book.orderId;
    const purchased = library?.find((b) => b.id == book?.id);
    return purchased?.orderId || '';
  };

  const handleReadNow = (bookId: string) => {
    const token = localStorage.getItem('auth_token');
    const url = `${reader_route}?bookId=${bookId}&orderId=${getOrderId()}${token ? `&auth_token=${encodeURIComponent(token)}` : ''}`;
    window.location.href = url;
  };

  const handleAddToCart = () => {
    addToCart(book, {
      onSuccess: () => {
        toast({
          title: 'Added to cart',
          description: 'Book has been added to your cart.',
        });
        navigate('/cart');
      },
      onError: (error: Error) => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message?.includes('duplicate')
            ? 'This book is already in your cart'
            : 'Failed to add to cart',
        });
      },
    });
  };

  const handleAddFreeBook = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      await addFreeBookAsync(Number(book.id));
      toast({
        title: 'Added to Library',
        description: 'Book has been added to your library.',
      });
    } catch (error: unknown) {
      const errMsg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add book to library';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errMsg,
      });
    }
  };

  if (isLoading) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="container py-16 flex justify-center">
          <PageLoader />
        </div>
      </>
    );
  }

  if (!book) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Book not found</h1>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </>
    );
  }

  console.log('Book Detail:', book);

  // Check if book is already in cart
  const isInCart = cartItems.some((item: { book?: { id: string }; bookId?: string; id: string }) => {
    const itemBookId = item.book?.id || item.bookId || item.id;
    return itemBookId == book.id;
  });

  return (
    <>
      {/* <Navbar /> */}
      <div className="container pt-8 pb-16 min-h-screen">
        <Breadcrumb />
        <br />
        <div className="grid lg:grid-cols-2 gap-12">
            <div className="aspect-[4.5/4] rounded-lg overflow-hidden bg-none shadow-none md:sticky top-20">
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-contain bg-no-repeat"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <span className="text-8xl font-bold text-muted-foreground">
                    {book.title[0]}
                  </span>
                </div>
              )}
            </div>
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">by {book.author}</p>
              {book.category && (
                <Badge className="mb-4">{book.category?.name}</Badge>
              )}
            </div>

            {(() => {
              const priceInfo = getBookPriceForCountry(book.prices, selectedCountry, 'soft_copy', countryCurrencies)
              return (
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-bold text-primary">
                    {priceInfo.symbol}{Number(priceInfo.price).toLocaleString()}
                  </span>
                </div>
              )
            })()}

            {isPurchased ? (
              <div className='flex flex-col md:flex-row md:items-center gap-4'>
                <Button
                  size="lg"
                  className="w-full"
                  liquidGlass={false}
                  onClick={() => handleReadNow(String(book.id))}
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Read Now
                </Button>

              </div>
            ) : getBookPriceForCountry(book.prices, selectedCountry, 'soft_copy', countryCurrencies).price === 0 ? (
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddFreeBook}
                  liquidGlass={false}
                disabled={isAddingFreeBook}
              >
                {isAddingFreeBook ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-5 w-5" />
                )}
                Add to Library
              </Button>
            ) : isInCart ? (
              <Button
                size="lg"
                liquidGlass={false}
                className="w-full"
                disabled
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Added to Cart
              </Button>
            ) : (
              <Button
                size="lg"
                liquidGlass={false}
                className="w-full"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingCart className="mr-2 h-5 w-5" />
                )}
                Add to Cart
              </Button>
            )}

            {book.description && (
              <LiquidGlassWrapper>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-4">About this book</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {book.description}
                  </p>
                </CardContent>
              </LiquidGlassWrapper>
            )}

            <LiquidGlassWrapper>
              <CardContent className="p-6 space-y-3">
                <h2 className="text-lg font-bold mb-4">Details</h2>
                {book.ISBN ? (
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">ISBN</div>
                      <div className="font-medium">{book.ISBN}</div>
                    </div>
                  </div>
                ) : null}
                
                {/* )} */}
                {book.publishedDate ? (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Published</div>
                      <div className="font-medium">
                        {new Date(book.publishedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ) : null}
                {book.pages && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Pages</div>
                      <div className="font-medium">{book.pages}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </LiquidGlassWrapper>
          </div>
        </div>
      {/* related books */}
      {book.category?.id && (
        <div className="mt-32 mb-10">
          <RelatedBooks categoryId={book.category.id} excludeBookId={book.id} showActions={false}  />
        </div>
      )}
      </div>

    </>
  );
};

export default BookDetail;
