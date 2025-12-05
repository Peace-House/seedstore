import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useCountry } from '@/hooks/useCountry';
import { getBookPriceForCountry } from '@/utils/pricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Smartphone, ArrowLeft, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initiatePaystackPayment, initiateMtnMomoPayment, PaymentMethod } from '@/services/payment';
import Breadcrumb from '@/components/Breadcrumb';
import { PageLoader } from '@/components/Loader';
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper';

const Checkout = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedCountry, selectedSymbol, countryCurrencies } = useCountry();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems: rawCartItems, isLoading } = useCart();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  const cartItems = Array.isArray(rawCartItems) ? rawCartItems : [];

  const total = cartItems.reduce((sum, item) => {
    const book = item.book || item;
    const priceInfo = getBookPriceForCountry(book.prices, selectedCountry, 'soft_copy', countryCurrencies);
    return sum + Number(priceInfo.price);
  }, 0);

  // Get currency code for the selected country
  const currencyInfo = countryCurrencies?.find(
    (cc: { country: string }) => cc.country.toLowerCase() === selectedCountry.toLowerCase()
  );
  const currencyCode = currencyInfo?.currency || 'NGN';

  // Paystack checkout mutation
  const paystackMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Login Required');
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');
      return await initiatePaystackPayment({
        amount: total,
        email: user.email,
        callback_url: `${window.location.origin}/payment-callback`,
      });
    },
    onSuccess: (data) => {
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else if (data?.status === 'error') {
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description: data.message || 'Failed to initiate payment',
        });
      }
    },
    onError: (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : 'Failed to initiate payment';
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: errMsg,
      });
    },
  });

  // MTN MoMo checkout mutation
  const mtnMomoMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Login Required');
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');
      if (!phoneNumber) throw new Error('Phone number is required');

      return await initiateMtnMomoPayment({
        amount: total,
        currency: currencyCode,
        phone: phoneNumber,
        payerMessage: `Payment for ${cartItems.length} book(s) from Livingseed`,
        payeeNote: `Order from ${user.email}`,
      });
    },
    onSuccess: (data) => {
      // Store referenceId for status checking
      if (data?.referenceId) {
        navigate(`/payment-callback?method=mtnmomo&reference=${data.referenceId}`);
      } else {
        toast({
          title: 'Payment Initiated',
          description: 'Please check your phone to approve the payment.',
        });
      }
    },
    onError: (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : 'Failed to initiate MTN MoMo payment';
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: errMsg,
      });
    },
  });

  const handleProceedToPayment = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to complete your purchase.',
      });
      navigate('/auth?redirect=checkout');
      return;
    }

    if (selectedMethod === 'paystack') {
      paystackMutation.mutate();
    } else if (selectedMethod === 'mtnmomo') {
      if (!phoneNumber) {
        toast({
          variant: 'destructive',
          title: 'Phone Number Required',
          description: 'Please enter your MTN Mobile Money phone number.',
        });
        return;
      }
      mtnMomoMutation.mutate();
    }
  };

  const isPending = paystackMutation.isPending || mtnMomoMutation.isPending;

  if (isLoading || authLoading) {
    return (
      <div className="container py-16 flex justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mt-8 pb-16">
        <Breadcrumb />
        <Card className="bg-transparent border-none shadow-none">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button onClick={() => navigate('/')}>Continue Shopping</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mt-8 pb-16">
      <Breadcrumb />
      <button
        onClick={() => navigate('/cart')}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </button>
      <h1 className="text-4xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Payment Methods */}
        <div className="lg:col-span-2 space-y-6">
          <LiquidGlassWrapper className="p-6">
            <h2 className="text-xl font-bold mb-4">Select Payment Method</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Paystack Option */}
              <button
                onClick={() => setSelectedMethod('paystack')}
                className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                  selectedMethod === 'paystack'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {selectedMethod === 'paystack' && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-[#00C3F7]/10 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-[#00C3F7]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Paystack</h3>
                    <p className="text-sm text-muted-foreground">Card, Bank Transfer, USSD</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pay securely with your debit/credit card, bank transfer, or USSD
                </p>
              </button>

              {/* MTN MoMo Option */}
              <div
                className="relative p-6 rounded-xl border-2 border-border bg-muted/30 cursor-not-allowed opacity-60"
              >
                <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  Coming Soon
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-[#FFCC00]/10 rounded-full flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-[#FFCC00]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">MTN Mobile Money</h3>
                    <p className="text-sm text-muted-foreground">Pay with MoMo</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pay directly from your MTN Mobile Money wallet
                </p>
              </div>
            </div>
          </LiquidGlassWrapper>

          {/* MTN MoMo Phone Input */}
          {selectedMethod === 'mtnmomo' && (
            <LiquidGlassWrapper className="p-6">
              <h2 className="text-xl font-bold mb-4">MTN Mobile Money Details</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="e.g. 256771234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your MTN Mobile Money registered phone number with country code (e.g., 256 for Uganda)
                  </p>
                </div>
              </div>
            </LiquidGlassWrapper>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <LiquidGlassWrapper className="sticky top-20 p-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {cartItems.map((item, idx) => {
                const book = item.book || item;
                const priceInfo = getBookPriceForCountry(book.prices, selectedCountry, 'soft_copy', countryCurrencies);
                return (
                  <div key={item.id + idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate max-w-[180px]">{book.title}</span>
                    <span className="font-medium">
                      {priceInfo.symbol}
                      {Number(priceInfo.price).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Items ({cartItems.length})</span>
                <span>
                  {selectedSymbol}
                  {total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {selectedSymbol}
                  {total.toLocaleString()}
                </span>
              </div>
            </div>
            <Button
              className="w-full mt-6"
              size="lg"
              liquidGlass={false}
              onClick={handleProceedToPayment}
              disabled={isPending || !selectedMethod || (selectedMethod === 'mtnmomo' && !phoneNumber)}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending
                ? 'Processing...'
                : selectedMethod
                ? `Pay with ${selectedMethod === 'paystack' ? 'Paystack' : 'MTN MoMo'}`
                : 'Select Payment Method'}
            </Button>
            {selectedMethod && (
              <p className="text-xs text-center text-muted-foreground mt-3">
                By proceeding, you agree to our Terms of Service
              </p>
            )}
          </LiquidGlassWrapper>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
