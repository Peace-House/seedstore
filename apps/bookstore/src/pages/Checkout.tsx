import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useCountry } from '@/hooks/useCountry'
import { getBookPriceForCountry } from '@/utils/pricing'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Loader2,
  CreditCard,
  ArrowLeft,
  Check,
  Apple,
  Wallet,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  initiatePaystackPayment,
  initiateFlutterwavePayment,
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

  const cartItems = Array.isArray(rawCartItems) ? rawCartItems : []

  // Get currency code for the selected country
  const currencyInfo = countryCurrencies?.find(
    (cc: { country: string }) =>
      cc.country.toLowerCase() === selectedCountry.toLowerCase(),
  )
  const currencyCode = currencyInfo?.currency || 'NGN'
  const normalizedCurrencyCode = currencyCode.toUpperCase()

  const availableMethods: PaymentMethod[] = useMemo(
    () =>
      normalizedCurrencyCode === 'USD'
        ? ['applepay', 'flutterwave']
        : normalizedCurrencyCode === 'NGN'
        ? ['paystack', 'flutterwave']
        : ['flutterwave'],
    [normalizedCurrencyCode],
  )

  const getItemBook = (
    item: unknown,
  ): {
    id: number | string
    title: string
    prices:
      | {
          country?: string | null
          currency: string
          soft_copy_price: number
          hard_copy_price: number
        }[]
      | undefined
  } => {
    const source = item as { book?: unknown }
    const book =
      source.book && typeof source.book === 'object'
        ? source.book
        : (item as object)

    return book as {
      id: number | string
      title: string
      prices:
        | {
            country?: string | null
            currency: string
            soft_copy_price: number
            hard_copy_price: number
          }[]
        | undefined
    }
  }

  useEffect(() => {
    if (selectedMethod && !availableMethods.includes(selectedMethod)) {
      setSelectedMethod(availableMethods[0] ?? null)
      return
    }

    if (!selectedMethod && availableMethods.length > 0) {
      setSelectedMethod(availableMethods[0])
    }
  }, [availableMethods, selectedMethod])

  const { data: groupSummary, isLoading: isGroupSummaryLoading } = useQuery({
    queryKey: ['group-cart-summary', user?.id, currencyCode],
    queryFn: () => getCartWithGroupPurchases(currencyCode),
    enabled: !!user,
  })

  const isComputingGroupSummary =
    !!user && isGroupSummaryLoading && !groupSummary

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
        const book = getItemBook(item)
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

  const flutterwaveMutation = useMutation({
    mutationFn: async (paymentOptions?: string) => {
      if (!user) throw new Error('Login Required')
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty')

      const cartItemsMetadata = cartItems.map((item) => {
        const book = getItemBook(item)
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

      return await initiateFlutterwavePayment({
        amount: payableTotal,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        phoneNumber: user.phoneNumber,
        redirect_url: `${window.location.origin}/payment-callback?method=flutterwave`,
        payment_options:
          paymentOptions ||
          'card,banktransfer,ussd,mobilemoney,account,applepay,googlepay,nqr',
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
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description:
            data?.message || 'Failed to initiate Flutterwave payment',
        })
      }
    },
    onError: (error: unknown) => {
      const errMsg =
        error instanceof Error
          ? error.message
          : 'Failed to initiate Flutterwave payment'
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
      paystackMutation.mutate([
        'card',
        'bank',
        'ussd',
        'qr',
        'mobile_money',
        'bank_transfer',
        'eft',
        'payattitude',
      ])
    } else if (selectedMethod === 'applepay') {
      // Apple Pay is routed through Flutterwave as an applepay-only checkout.
      flutterwaveMutation.mutate('applepay')
    } else if (selectedMethod === 'flutterwave') {
      flutterwaveMutation.mutate(undefined)
    }
  }

  const isPending = paystackMutation.isPending || flutterwaveMutation.isPending

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

  if (isComputingGroupSummary) {
    return (
      <div className="container mt-8 pb-16">
        <Breadcrumb />
        <Card className="border-none bg-transparent shadow-none">
          <CardContent className="py-16 text-center">
            <PageLoader />
            <p className="text-muted-foreground mt-4 text-sm">
              Calculating your group-buy savings...
            </p>
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
              {availableMethods.includes('paystack') && (
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
                        Card, Bank Transfer, USSD
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Pay securely with your debit/credit card, bank transfer, or
                    USSD
                  </p>
                </button>
              )}

              {availableMethods.includes('applepay') && (
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
                    Pay quickly with Apple Pay via Flutterwave on supported
                    devices
                  </p>
                </button>
              )}

              {availableMethods.includes('flutterwave') && (
                <button
                  onClick={() => setSelectedMethod('flutterwave')}
                  className={`relative rounded-xl border-2 p-6 text-left transition-all ${
                    selectedMethod === 'flutterwave'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {selectedMethod === 'flutterwave' && (
                    <div className="bg-primary absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="mb-3 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FB9129]/10">
                      <Wallet className="h-6 w-6 text-[#FB9129]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Flutterwave</h3>
                      <p className="text-muted-foreground text-sm">
                        Cards, Bank Transfer, Mobile Money, Wallets
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Use Flutterwave checkout for cards, bank payments, mobile
                    money, USSD, wallets, and local payment methods.
                  </p>
                </button>
              )}
            </div>
          </LiquidGlassWrapper>
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
              disabled={isPending || !selectedMethod}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending
                ? 'Processing...'
                : selectedMethod
                ? `Pay with ${
                    selectedMethod === 'paystack'
                      ? 'Paystack'
                      : selectedMethod === 'flutterwave'
                      ? 'Flutterwave'
                      : selectedMethod === 'applepay'
                      ? 'Apple Pay'
                      : 'Payment Provider'
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
