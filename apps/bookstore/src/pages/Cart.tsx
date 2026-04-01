import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useCountry } from '@/hooks/useCountry'
import { getBookPriceForCountry } from '@/utils/pricing'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Breadcrumb from '@/components/Breadcrumb'
import { useEffect, useState } from 'react'
import { PageLoader } from '@/components/Loader'
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper'
import GroupBuyModal from '@/components/GroupBuyModal'
import { getCartWithGroupPurchases } from '@/services/groupPurchase'
import { useQuery } from '@tanstack/react-query'
import { getAppFeatureSettings } from '@/services/admin'

const Cart = () => {
  const { user, loading: authLoading } = useAuth()
  const { selectedCountry, selectedSymbol, countryCurrencies } = useCountry()

  const [searchParams] = useSearchParams()
  const isCheckout = searchParams.get('action')

  const navigate = useNavigate()
  const { toast } = useToast()
  const { cartItems: rawCartItems, isLoading, removeFromCart } = useCart()
  const [groupBuyBook, setGroupBuyBook] = useState<{
    id: number | string
    title: string
    groupPurchase?: {
      id: string
      totalSeats: number
      discountPercent: number
      assignedSeats?: number
      phcodes?: string[]
    } | null
  } | null>(null)
  const [deletingBookIds, setDeletingBookIds] = useState<Set<string>>(new Set())

  const currencyInfo = countryCurrencies?.find(
    (cc: { country: string }) =>
      cc.country.toLowerCase() === selectedCountry.toLowerCase(),
  )
  const currencyCode = currencyInfo?.currency || 'NGN'

  const {
    data: groupSummary,
    isLoading: isGroupSummaryLoading,
    isFetching: isGroupSummaryFetching,
  } = useQuery({
    queryKey: ['group-cart-summary', user?.id, currencyCode],
    queryFn: () => getCartWithGroupPurchases(currencyCode),
    enabled: !!user,
  })

    const { data: featureSettings } = useQuery({
      queryKey: ['app-feature-settings'],
      queryFn: getAppFeatureSettings,
      staleTime: 60_000,
    })
    const groupBuyingEnabled = featureSettings?.group_buying_enabled ?? true

  // Backend returns cart object with items array
  const cartItems = Array.isArray(rawCartItems) ? rawCartItems : []

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to complete your purchase.',
      })
      navigate('/auth?redirect=cart')
      return
    }
    // Navigate to checkout page for payment method selection
    navigate('/checkout')
  }

  useEffect(() => {
    if (user && isCheckout && cartItems?.length > 0) {
      navigate('/checkout')
    }
  }, [user, isCheckout, cartItems.length, navigate])

  const isGroupSummaryPending =
    !!user &&
    cartItems.length > 0 &&
    (isGroupSummaryLoading || isGroupSummaryFetching)
  const isCartPageLoading = isLoading || isGroupSummaryPending

  if (isCartPageLoading) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="container flex justify-center py-16">
          <PageLoader />
        </div>
      </>
    )
  }

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

  const groupPurchases = Array.isArray(groupSummary?.groupPurchases)
    ? groupSummary.groupPurchases
    : []
  const groupByBookId = new Map<number, any>(
    groupPurchases.map((gp: any) => [Number(gp.bookId), gp]),
  )
  const individualTotal = Number(groupSummary?.individualTotal ?? total)
  const groupTotal = Number(groupSummary?.groupTotal ?? 0)
  const grandTotal = Number(groupSummary?.grandTotal ?? total)

  return (
    <>
      <div className="container mt-8 pb-16">
        <GroupBuyModal
          open={!!groupBuyBook}
          onOpenChange={(open) => {
            if (!open) setGroupBuyBook(null)
          }}
          book={groupBuyBook}
          existingGroupPurchase={groupBuyBook?.groupPurchase || null}
          currency={currencyCode}
        />
        <Breadcrumb />
        <h1 className="mb-8 text-4xl font-bold">Shopping Cart</h1>

        {!cartItems || cartItems.length === 0 ? (
          <Card className="border-none bg-transparent shadow-none">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Button onClick={() => navigate('/')}>Continue Shopping</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <LiquidGlassWrapper className="space-y-4 rounded-md border-[1.5px] shadow-md md:min-h-[50vh] md:bg-white lg:col-span-2">
              {cartItems.map((item, idx) => {
                const book = item.book || item
                const gp = groupByBookId.get(Number(book.id))
                const deletingKey = String(book.id)
                const isDeleting = deletingBookIds.has(deletingKey)
                return (
                  <div key={item.id + idx}>
                    <Card
                      key={item.id}
                      className="border-none bg-transparent shadow-none"
                    >
                      <CardContent
                        className={`flex gap-4 px-0 md:p-6 ${
                          isDeleting ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="bg-muted h-28 w-20 flex-shrink-0 overflow-hidden rounded md:h-40 md:w-28">
                          {book.coverImage ? (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="from-primary/20 to-accent/20 flex h-full w-full items-center justify-center bg-gradient-to-br">
                              <span className="text-muted-foreground text-4xl font-bold">
                                {book.title?.[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xs font-semibold md:text-lg">
                            {book.title}
                          </h3>
                          <p className="text-muted-foreground text-xs md:text-sm">
                            {book.author}
                          </p>
                          {(() => {
                            const priceInfo = getBookPriceForCountry(
                              book.prices,
                              selectedCountry,
                              'soft_copy',
                              countryCurrencies,
                            )
                            return (
                              <p className="text-primary mt-2 text-xs font-bold md:text-2xl">
                                {priceInfo.symbol}
                                {Number(priceInfo.price).toLocaleString()}
                              </p>
                            )
                          })()}
                          {user && (
                            <div className="mt-3 flex flex-col gap-2">
                              {gp &&
                                  groupBuyingEnabled &&
                                  book.allowGroupBuy !== false &&
                                  (() => {
                                  const priceInfo = getBookPriceForCountry(
                                    book.prices,
                                    selectedCountry,
                                    'soft_copy',
                                    countryCurrencies,
                                  )
                                  const pricePerSeat =
                                    gp.pricePerSeat ?? Number(priceInfo.price)
                                  const fullTotal = pricePerSeat * gp.totalSeats
                                  const discountedTotal =
                                    gp.totalPaid ?? fullTotal
                                  const hasDiscount = gp.discountPercent > 0
                                  return (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-muted-foreground text-xs">
                                        Group ({gp.totalSeats} users):
                                      </span>
                                      {hasDiscount && (
                                        <span className="text-muted-foreground text-xs line-through">
                                          {priceInfo.symbol}
                                          {fullTotal.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </span>
                                      )}
                                      <span className="text-primary text-sm font-bold">
                                        {priceInfo.symbol}
                                        {Number(discountedTotal).toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          },
                                        )}
                                      </span>
                                      {hasDiscount && (
                                        <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-green-900/30 dark:text-green-400">
                                          -{gp.discountPercent}%
                                        </span>
                                      )}
                                    </div>
                                  )
                                })()}
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-full"
                                  style={{
                                    fontSize: '13px',
                                  }}
                                  variant={'default'}
                                    disabled={!groupBuyingEnabled || book.allowGroupBuy === false}
                                    onClick={() =>
                                      setGroupBuyBook({
                                      id: book.id,
                                      title: book.title,
                                      groupPurchase: gp
                                        ? {
                                            id: gp.id,
                                            totalSeats: gp.totalSeats,
                                            discountPercent: gp.discountPercent,
                                            assignedSeats: gp.assignedSeats,
                                            phcodes: Array.isArray(gp.seats)
                                              ? gp.seats
                                                  .map((seat: any) =>
                                                    typeof seat?.phcode ===
                                                    'string'
                                                      ? seat.phcode
                                                      : '',
                                                  )
                                                  .filter(
                                                    (p: string) =>
                                                      p.trim().length > 0,
                                                  )
                                              : [],
                                          }
                                        : null,
                                    })
                                  }
                                >
                                  {gp ? 'Edit Group' : 'Buy for a Group'}
                                </Button>
                              </div>
                                {(!groupBuyingEnabled || book.allowGroupBuy === false) && (
                                  <p className="text-muted-foreground text-xs">
                                    Group buying is not available for this item.
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const id = String(book.id)
                            setDeletingBookIds((prev) => new Set(prev).add(id))
                            removeFromCart(
                              { bookId: book.id },
                              {
                                onSettled: () => {
                                  setDeletingBookIds((prev) => {
                                    const next = new Set(prev)
                                    next.delete(id)
                                    return next
                                  })
                                },
                              },
                            )
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                        {isDeleting ? (
                          <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-[10px] font-medium">
                            Deleting...
                          </span>
                        ) : null}
                      </CardContent>
                    </Card>
                    <hr className="border-gray-100" />
                  </div>
                )
              })}
            </LiquidGlassWrapper>
            {/* <div>
              <LiquidGlassWrapper className="sticky top-20 rounded shadow-none border-none">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold">Important Notice!</h2>
                  <div className="space-y-2">
                    <ul className="grid gap-3 list-disc pl-5">
                      <li className="text-muted-foreground">Books purchased on this platfrom are not downloadable.</li>
                      <li>They are deposited in your Library, to read online and offline</li>
                      <li>To read the books offline, download the offline-reader(Look for a laptop icon with a down arrow in your browser's address bar, and click on it to install.)</li>
                    </ul>
                  </div>
                </CardContent>
              </LiquidGlassWrapper>
            </div> */}
            <div className="space-y-8">
              <LiquidGlassWrapper className="sticky top-20 rounded border-none shadow-none">
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-2xl font-bold">Order Summary</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Items ({cartItems.length})
                      </span>
                      <span className="font-semibold">
                        {selectedSymbol}
                        {individualTotal.toLocaleString()}
                      </span>
                    </div>
                    {groupTotal > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Group buys
                        </span>
                        <span className="text-primary font-semibold">
                          {selectedSymbol}
                          {groupTotal.toLocaleString()}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-t pt-2 text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        {selectedSymbol}
                        {grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    liquidGlass={false}
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0 || isGroupSummaryPending}
                  >
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </LiquidGlassWrapper>
              <LiquidGlassWrapper className="sticky top-20 rounded border-none shadow-none">
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-2xl font-bold text-red-600">
                    Important Notice!
                  </h2>
                  <div className="space-y-2">
                    <ul className="grid list-disc gap-3 pl-5 ">
                      <li>
                        Books purchased on this platfrom are not downloadable.
                      </li>
                      <li>
                        They are available in your Library, to read online and
                        offline
                      </li>
                      <li>
                        To read the books offline, download the
                        offline-reader(Look for a laptop icon with a down arrow
                        in your browser's address bar, and click on it to
                        install.)
                      </li>
                      <li>
                        Click country at the top right corner to change to your
                        preferred cunnrency
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </LiquidGlassWrapper>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Cart
