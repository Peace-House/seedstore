import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initiatePaystackPayment } from '@/services/payment';
import Breadcrumb from '@/components/Breadcrumb';
import { useEffect } from 'react';
import { PageLoader } from '@/components/Loader';

const Cart = () => {
  const { user, loading: authLoading } = useAuth();

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

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Login Required');
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');
      const total = cartItems.reduce(
        (sum, item) => sum + Number(item.book?.price ?? item.price ?? 0),
        0
      );
      return await initiatePaystackPayment(
        {
          amount: total,
          email: user.email,
          callback_url: `${window.location.origin}/payment-callback`
        }
      );
    },
    onSuccess: (data) => {
      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      }
    },
    onError: (error: unknown) => {
      const errMsg = (error instanceof Error) ? error.message : 'Failed to initiate payment';
      toast({
        variant: 'destructive',
        title: 'Checkout Failed',
        description: errMsg,
      });
    },
  });

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to complete your purchase.',
      });
      navigate('/auth?redirect=cart');
      return;
    }
    checkoutMutation.mutate();
  };

  useEffect(() => {
    if(user&&isCheckout&&cartItems?.length>0){
      navigate('/cart')
    checkoutMutation.mutate();
    }
  }, [user, isCheckout, cartItems.length])

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
    (sum, item) => sum + Number(item.book?.price ?? item.price ?? 0),
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
            <div className="lg:col-span-2 space-y-4 shadow-md border-[1.5px] rounded-md md:bg-white md:min-h-[50vh]">
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
                        <p className="text-xs md:text-2xl font-bold text-primary mt-2">
                          ₦{Number(book.price ?? 0).toLocaleString()}
                        </p>
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
            </div>
            <div>
              <Card className="sticky top-20 rounded shadow-none border-none">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold">Order Summary</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items ({cartItems.length})</span>
                      <span className="font-semibold">
                        ₦{total.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        ₦{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={checkoutMutation.isPending || cartItems.length === 0}
                  >
                    {checkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
