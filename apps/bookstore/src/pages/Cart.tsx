import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useCountry } from '@/hooks/useCountry';
import { getBookPriceForCountry } from '@/utils/pricing';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Breadcrumb from '@/components/Breadcrumb';
import { useEffect } from 'react';
import { PageLoader } from '@/components/Loader';
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper';

const Cart = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedCountry, selectedSymbol, countryCurrencies } = useCountry();

  const [searchParams] = useSearchParams();
    const isCheckout = searchParams.get('action');

  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    cartItems: rawCartItems,
    isLoading,
    removeFromCart,
    isRemovingFromCart
  } = useCart();

  // Backend returns cart object with items array
  const cartItems = Array.isArray(rawCartItems) ? rawCartItems : [];

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to complete your purchase.',
      });
      navigate('/auth?redirect=cart');
      return;
    }
    // Navigate to checkout page for payment method selection
    navigate('/checkout');
  };

  useEffect(() => {
    if(user && isCheckout && cartItems?.length > 0){
      navigate('/checkout');
    }
  }, [user, isCheckout, cartItems.length, navigate])

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
 

  const total = cartItems.reduce(
    (sum, item) => {
      const book = item.book || item;
      const priceInfo = getBookPriceForCountry(book.prices, selectedCountry, 'soft_copy', countryCurrencies);
      return sum + Number(priceInfo.price);
    },
    0
  );

  

  return (
    <>
      <div className="container mt-8 pb-16">
        <Breadcrumb />
        <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

        {!cartItems || cartItems.length === 0 ? (
          <Card className='bg-transparent border-none shadow-none'>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Button onClick={() => navigate('/')}>Continue Shopping</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <LiquidGlassWrapper className="lg:col-span-2 space-y-4 shadow-md border-[1.5px] rounded-md md:bg-white md:min-h-[50vh]">
              {cartItems.map((item, idx) => {
                const book = item.book || item;
                return (
                  <div key={item.id+idx}>
                  <Card key={item.id} className='bg-transparent border-none shadow-none'>
                    <CardContent className="px-0 md:p-6 flex gap-4">
                      <div className="w-16 h-20 md:w-24 md:h-32 flex-shrink-0 bg-muted rounded overflow-hidden">
                        {book.coverImage ? (
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                            <span className="text-4xl font-bold text-muted-foreground">
                              {book.title?.[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-xs md:text-lg">{book.title}</h3>
                        <p className="text-muted-foreground text-xs md:text-sm">{book.author}</p>
                        {(() => {
                          const priceInfo = getBookPriceForCountry(book.prices, selectedCountry, 'soft_copy', countryCurrencies);
                          return (
                            <p className="text-xs md:text-2xl font-bold text-primary mt-2">
                              {priceInfo.symbol}{Number(priceInfo.price).toLocaleString()}
                            </p>
                          );
                        })()}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          removeFromCart({ bookId: book.id });
                        }}
                        disabled={isRemovingFromCart}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </CardContent>
                  </Card>
                  <hr className='border-gray-100' />
                  </div>
                );
              })}
            </LiquidGlassWrapper>
            <div>
              <LiquidGlassWrapper className="sticky top-20 rounded shadow-none border-none">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold">Order Summary</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items ({cartItems.length})</span>
                      <span className="font-semibold">
                        {selectedSymbol}{total.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        {selectedSymbol}{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    liquidGlass={false}
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0}
                  >
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </LiquidGlassWrapper>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
