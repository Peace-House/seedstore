import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useCountry } from '@/hooks/useCountry'
import { getBookPriceForCountry } from '@/utils/pricing'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  CreditCard,
  Smartphone,
  ArrowLeft,
  Check,
  Apple,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  initiatePaystackPayment,
  initiateMtnMomoPayment,
  PaymentMethod,
} from '@/services/payment'
import { getCartWithGroupPurchases } from '@/services/groupPurchase'
import Breadcrumb from '@/components/Breadcrumb'
import { PageLoader } from '@/components/Loader'
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper'

const Checkout = () => {
  const { user, loading: authLoading } = useAuth()
  const { selectedCountry, selectedSymbol, countryCurrencies } = useCountry()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { cartItems: rawCartItems, isLoading } = useCart()

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  )
  const [phoneNumber, setPhoneNumber] = useState('')

  const cartItems = Array.isArray(rawCartItems) ? rawCartItems : []

  // Get currency code for the selected country
  const currencyInfo = countryCurrencies?.find(
    (cc: { country: string }) =>
      cc.country.toLowerCase() === selectedCountry.toLowerCase(),
  )
  const currencyCode = currencyInfo?.currency || 'NGN'

  const { data: groupSummary } = useQuery({
    queryKey: ['group-cart-summary', user?.id, currencyCode],
    queryFn: () => getCartWithGroupPurchases(currencyCode),
    enabled: !!user,
  })

  const total = cartItems.reduce((sum, item) => {
    const book = item.book || item
    const priceInfo = getBookPriceForCountry(
      book.prices,
      selectedCountry,
      'soft_copy',
      countryCurrencies,
    )
    return sum + Number(priceInfo.price)
  }, 0)

  const individualTotal = Number(groupSummary?.individualTotal ?? total)
  const groupTotal = Number(groupSummary?.groupTotal ?? 0)
  const payableTotal = Number(groupSummary?.grandTotal ?? total)

  console.log({
    total,
    individualTotal,
    groupTotal,
    payableTotal,
  })

  // Paystack checkout mutation
  const paystackMutation = useMutation({
    mutationFn: async (channels?: string[]) => {
      if (!user) throw new Error('Login Required')
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty')

      // Build metadata so the backend/webhook can reliably create orders
      const cartItemsMetadata = cartItems.map((item) => {
        const book = (item as any).book || item
        const priceInfo = getBookPriceForCountry(
          book.prices,
          selectedCountry,
          'soft_copy',
          countryCurrencies,
        )
        return {
          bookId: book.id,
          title: book.title,
          price: Number(priceInfo.price),
        }
      })

      return await initiatePaystackPayment({
        amount: payableTotal,
        email: user.email,
        callback_url: `${window.location.origin}/payment-callback`,
        channels,
        currency: currencyCode,
        metadata: {
          userId: user.id,
          cartItems: cartItemsMetadata,
        },
      })
    },
    onSuccess: (data) => {
      if (data?.authorization_url) {
        window.location.href = data.authorization_url
      } else if (data?.status === 'error') {
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description: data.message || 'Failed to initiate payment',
        })
      }
    },
    onError: (error: unknown) => {
      const errMsg =
        error instanceof Error ? error.message : 'Failed to initiate payment'
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: errMsg,
      })
    },
  })

  // MTN MoMo checkout mutation
  const mtnMomoMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Login Required')
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty')
      if (!phoneNumber) throw new Error('Phone number is required')

      return await initiateMtnMomoPayment({
        amount: payableTotal,
        currency: currencyCode,
        phone: phoneNumber,
        payerMessage: `Payment for ${cartItems.length} book(s) from Livingseed`,
        payeeNote: `Order from ${user.email}`,
      })
    },
    onSuccess: (data) => {
      // Store referenceId for status checking
      if (data?.referenceId) {
        navigate(
          `/payment-callback?method=mtnmomo&reference=${data.referenceId}`,
        )
      } else {
        toast({
          title: 'Payment Initiated',
          description: 'Please check your phone to approve the payment.',
        })
      }
    },
    onError: (error: unknown) => {
      const errMsg =
        error instanceof Error
          ? error.message
          : 'Failed to initiate MTN MoMo payment'
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: errMsg,
      })
    },
  })

  const handleProceedToPayment = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to complete your purchase.',
      })
      navigate('/auth?redirect=checkout')
      return
    }

    if (selectedMethod === 'paystack') {
      // paystackMutation.mutate([]);
      paystackMutation.mutate([
        'card',
        'bank',
        'apple_pay',
        'ussd',
        'qr',
        'mobile_money',
        'bank_transfer',
        'eft',
        'payattitude',
      ])
    } else if (selectedMethod === 'applepay') {
      // Apple Pay uses Paystack with apple_pay channel
      paystackMutation.mutate(['apple_pay'])
    } else if (selectedMethod === 'mtnmomo') {
      if (!phoneNumber) {
        toast({
          variant: 'destructive',
          title: 'Phone Number Required',
          description: 'Please enter your MTN Mobile Money phone number.',
        })
        return
      }
      mtnMomoMutation.mutate()
    }
  }

  const isPending = paystackMutation.isPending || mtnMomoMutation.isPending

  if (isLoading || authLoading) {
    return (
      <div className="container flex justify-center py-16">
        <PageLoader />
      </div>
    )
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mt-8 pb-16">
        <Breadcrumb />
        <Card className="border-none bg-transparent shadow-none">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button onClick={() => navigate('/')}>Continue Shopping</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mt-8 pb-16">
      <Breadcrumb />
      <button
        onClick={() => navigate('/cart')}
        className="text-muted-foreground hover:text-primary mb-4 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cart
      </button>
      <h1 className="mb-8 text-4xl font-bold">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Payment Methods */}
        <div className="space-y-6 lg:col-span-2">
          <LiquidGlassWrapper className="p-6">
            <h2 className="mb-4 text-xl font-bold">Select Payment Method</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Paystack Option */}
              <button
                onClick={() => setSelectedMethod('paystack')}
                className={`relative rounded-xl border-2 p-6 text-left transition-all ${
                  selectedMethod === 'paystack'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {selectedMethod === 'paystack' && (
                  <div className="bg-primary absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="mb-3 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00C3F7]/10">
                    <CreditCard className="h-6 w-6 text-[#00C3F7]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Paystack</h3>
                    <p className="text-muted-foreground text-sm">
                      {currencyCode === 'USD'
                        ? 'Card'
                        : 'Card, Bank Transfer, USSD'}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  {currencyCode === 'USD'
                    ? 'Pay securely with your debit/credit card'
                    : 'Pay securely with your debit/credit card, bank transfer, or USSD'}
                </p>
              </button>

              {/* Apple Pay Option */}
              <button
                onClick={() => setSelectedMethod('applepay')}
                className={`relative rounded-xl border-2 p-6 text-left transition-all ${
                  selectedMethod === 'applepay'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {selectedMethod === 'applepay' && (
                  <div className="bg-primary absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="mb-3 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                    <Apple className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Apple Pay</h3>
                    <p className="text-muted-foreground text-sm">
                      Fast & secure checkout
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  Pay quickly with Apple Pay on supported devices
                </p>
              </button>

              {/* MTN MoMo Option */}
              {currencyCode === 'NGN' && (
                <div className="border-border bg-muted/30 relative cursor-not-allowed rounded-xl border-2 p-6 opacity-60">
                  <div className="absolute top-3 right-3 rounded-full bg-amber-500 px-2 py-1 text-xs font-semibold text-white">
                    Coming Soon
                  </div>
                  <div className="mb-3 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFCC00]/10">
                      <Smartphone className="h-6 w-6 text-[#FFCC00]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        MTN Mobile Money
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Pay with MoMo
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Pay directly from your MTN Mobile Money wallet
                  </p>
                </div>
              )}
            </div>
          </LiquidGlassWrapper>

          {/* MTN MoMo Phone Input */}
          {selectedMethod === 'mtnmomo' && (
            <LiquidGlassWrapper className="p-6">
              <h2 className="mb-4 text-xl font-bold">
                MTN Mobile Money Details
              </h2>
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
                  <p className="text-muted-foreground text-xs">
                    Enter your MTN Mobile Money registered phone number with
                    country code (e.g., 256 for Uganda)
                  </p>
                </div>
              </div>
            </LiquidGlassWrapper>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <LiquidGlassWrapper className="sticky top-20 p-6">
            <h2 className="mb-4 text-xl font-bold">Order Summary</h2>
            <div className="mb-4 space-y-3">
              {cartItems.map((item, idx) => {
                const book = item.book || item
                const priceInfo = getBookPriceForCountry(
                  book.prices,
                  selectedCountry,
                  'soft_copy',
                  countryCurrencies,
                )
                return (
                  <div
                    key={item.id + idx}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground max-w-[180px] truncate">
                      {book.title}
                    </span>
                    <span className="font-medium">
                      {priceInfo.symbol}
                      {Number(priceInfo.price).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="border-t pt-3">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Items ({cartItems.length})
                </span>
                <span>
                  {selectedSymbol}
                  {individualTotal.toLocaleString()}
                </span>
              </div>
              {groupTotal > 0 ? (
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Group buys</span>
                  <span className="text-primary">
                    {selectedSymbol}
                    {groupTotal.toLocaleString()}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {selectedSymbol}
                  {payableTotal.toLocaleString()}
                </span>
              </div>
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              liquidGlass={false}
              onClick={handleProceedToPayment}
              disabled={
                isPending ||
                !selectedMethod ||
                (selectedMethod === 'mtnmomo' && !phoneNumber)
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending
                ? 'Processing...'
                : selectedMethod
                ? `Pay with ${
                    selectedMethod === 'paystack'
                      ? 'Paystack'
                      : selectedMethod === 'applepay'
                      ? 'Apple Pay'
                      : 'MTN MoMo'
                  }`
                : 'Select Payment Method'}
            </Button>
            {selectedMethod && (
              <p className="text-muted-foreground mt-3 text-center text-xs">
                By proceeding, you agree to our Terms of Service
              </p>
            )}
          </LiquidGlassWrapper>
        </div>
      </div>
    </div>
  )
}

export default Checkout
