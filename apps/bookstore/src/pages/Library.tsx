import { BookOpen, GripVertical, Clock, AlertTriangle, X } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { useLibrary } from '@/hooks/useLibrary'
import { Book } from '@/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Breadcrumb from '@/components/Breadcrumb'
import { PageLoader } from '@/components/Loader'
import {
  createPeerLending,
  getMyPeerLends,
  getPeerLendingConfig,
  returnPeerLending,
  revokePeerLending,
} from '@/services/peerLending'
import { useToast } from '@/hooks/use-toast'

const LIBRARY_ORDER_KEY = 'library_book_order'
const LIBRARY_PURCHASE_BANNER_DISMISSED_KEY =
  'library_purchase_banner_dismissed'

const Library = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { library: purchasedBooks, isLoading } = useLibrary()
  const { data: lendingConfig } = useQuery({
    queryKey: ['peer-lending-config'],
    queryFn: getPeerLendingConfig,
    enabled: !!user,
  })
  const { data: myLends = [] } = useQuery({
    queryKey: ['peer-lending-my-lends', user?.id],
    queryFn: getMyPeerLends,
    enabled: !!user,
  })

  const [shareOpen, setShareOpen] = useState(false)
  const [shareBook, setShareBook] = useState<Book | null>(null)
  const [recipient, setRecipient] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [showPurchaseBanner, setShowPurchaseBanner] = useState(() => {
    return (
      localStorage.getItem(LIBRARY_PURCHASE_BANNER_DISMISSED_KEY) !== 'true'
    )
  })

  // State for ordered books and drag-and-drop
  const [orderedBooks, setOrderedBooks] = useState<Book[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [now, setNow] = useState(new Date())

  const lendMutation = useMutation({
    mutationFn: async () => {
      if (!shareBook) throw new Error('No book selected')
      return createPeerLending({
        bookId: shareBook.id,
        recipient,
        durationDays,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-lending-my-lends'] })
      queryClient.invalidateQueries({ queryKey: ['library'] })
      toast({ title: 'Access shared successfully' })
      setShareOpen(false)
      setRecipient('')
      setDurationDays(1)
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Unable to share access',
        description:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Please try again.',
      })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokePeerLending(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-lending-my-lends'] })
      queryClient.invalidateQueries({ queryKey: ['library'] })
      toast({ title: 'Lending revoked' })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Unable to revoke lending',
        description:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Please try again.',
      })
    },
  })

  const returnMutation = useMutation({
    mutationFn: (id: string) => returnPeerLending(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-lending-my-lends'] })
      queryClient.invalidateQueries({ queryKey: ['library'] })
      toast({ title: 'Book returned successfully' })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Unable to return book',
        description:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Please try again.',
      })
    },
  })

  // Update "now" every minute for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Load saved order from localStorage and apply to books
  useEffect(() => {
    if (purchasedBooks && Array.isArray(purchasedBooks)) {
      const savedOrder = localStorage.getItem(LIBRARY_ORDER_KEY)
      if (savedOrder) {
        try {
          const orderIds: (number | string)[] = JSON.parse(savedOrder)
          const sorted = [...purchasedBooks].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id)
            const indexB = orderIds.indexOf(b.id)
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
          })
          setOrderedBooks(sorted)
        } catch {
          setOrderedBooks([...purchasedBooks])
        }
      } else {
        setOrderedBooks([...purchasedBooks])
      }
    }
  }, [purchasedBooks])

  // Save order to localStorage
  const saveOrder = useCallback((books: Book[]) => {
    const orderIds = books.map((book) => book.id)
    localStorage.setItem(LIBRARY_ORDER_KEY, JSON.stringify(orderIds))
  }, [])

  // Move book within ordered list using array indexes - simple reorder
  const moveBook = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return

      setOrderedBooks((prevBooks) => {
        if (prevBooks.length === 0) return prevBooks
        if (fromIndex < 0 || fromIndex >= prevBooks.length) return prevBooks
        if (toIndex < 0 || toIndex >= prevBooks.length) return prevBooks

        // Create new array and reorder
        const newBooks = Array.from(prevBooks)
        const [removed] = newBooks.splice(fromIndex, 1)
        newBooks.splice(toIndex, 0, removed)

        // Verify no duplicates
        const ids = new Set(newBooks.map((b) => b.id))
        if (ids.size !== newBooks.length) {
          console.error('Duplicate detected, reverting')
          return prevBooks
        }

        saveOrder(newBooks)
        return newBooks
      })
    },
    [saveOrder],
  )

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    setHoverIndex(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))

    const target = e.currentTarget as HTMLElement
    setTimeout(() => {
      target.style.opacity = '0.4'
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    setDraggedIndex(null)
    setHoverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number | null) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    if (index === null) {
      if (hoverIndex !== null) setHoverIndex(null)
      return
    }

    if (hoverIndex !== index) {
      setHoverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setHoverIndex(null)
      return
    }

    moveBook(draggedIndex, targetIndex)
    setDraggedIndex(null)
    setHoverIndex(null)
  }

  const getGlobalIndex = (shelfIndex: number, bookIndex: number) =>
    shelfIndex * booksPerShelf + bookIndex

  if (loading || isLoading) {
    return (
      <>
        <PageLoader />
      </>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }
  const handleReadNow = (bookId: number | string, orderId: string) => {
    const reader_route = import.meta.env.VITE_BOOKREADER_URL!
    const token = localStorage.getItem('auth_token')
    const url = `${reader_route}?bookId=${bookId}&orderId=${orderId}${
      token ? `&auth_token=${encodeURIComponent(token)}` : ''
    }`
    window.location.href = url
  }

  const getTimeRemaining = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h left`
    return `${hours}h left`
  }

  const dismissPurchaseBanner = () => {
    localStorage.setItem(LIBRARY_PURCHASE_BANNER_DISMISSED_KEY, 'true')
    setShowPurchaseBanner(false)
  }

  const getPeerLendRecordId = (book: Book) => {
    if (book.borrowingSource !== 'PEER') return null
    if (!book.orderId?.startsWith('peerlend:')) return null
    return book.orderId.split(':')[1] || null
  }

  // Group books into shelves (8 books per shelf on large, 6 on md, 4 on tablet, 2 on mobile)
  // Using 8 as the max for grouping, CSS will handle responsive display
  const booksPerShelf = 8
  const shelves: Book[][] = []
  if (orderedBooks && orderedBooks.length > 0) {
    for (let i = 0; i < orderedBooks.length; i += booksPerShelf) {
      shelves.push(orderedBooks.slice(i, i + booksPerShelf))
    }
  }

  return (
    <>
      <Dialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open)
          if (!open) {
            setRecipient('')
            setDurationDays(1)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lend Book</DialogTitle>
            <DialogDescription>
              {shareBook
                ? `Lend "${shareBook.title}" temporarily.`
                : 'Lend this book temporarily.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="peer-recipient">Recipient PH-Code</Label>
              <Input
                id="peer-recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter recipient PH-Code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="peer-duration">Duration (days)</Label>
              <Input
                id="peer-duration"
                type="number"
                min={1}
                max={Math.max(lendingConfig?.max_lend_duration_days ?? 14, 1)}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value || 1))}
              />
              <p className="text-muted-foreground text-xs">
                Max {lendingConfig?.max_lend_duration_days ?? 14} days
              </p>
            </div>

            {lendingConfig?.allow_lender_access_during_lend === false && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                You will not have access to this book while lending is active.
              </div>
            )}

            <Button
              className="w-full rounded-full"
              variant="default"
              disabled={
                lendMutation.isPending ||
                !shareBook ||
                !recipient.trim() ||
                durationDays < 1 ||
                durationDays >
                  Math.max(lendingConfig?.max_lend_duration_days ?? 14, 1)
              }
              onClick={() => lendMutation.mutate()}
            >
              {lendMutation.isPending ? 'Lending...' : 'Confirm Lend'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="container py-8">
          <Breadcrumb />
          <br />
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-primary text-4xl font-bold">My Library</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => navigate('/manage-group-buy')}
              >
                Manage Group Buy
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => navigate('/manage-lent-books')}
              >
                Manage Lent Books
              </Button>
            </div>
          </div>

          {/* Purchase issue awareness banner */}
          {showPurchaseBanner && (
            <div className="relative mb-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 pr-12 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                aria-label="Close purchase help banner"
                className="absolute top-3 right-3 rounded-full p-1 text-amber-900/70 transition hover:bg-amber-100 hover:text-amber-900"
                onClick={dismissPurchaseBanner}
              >
                <X className="h-4 w-4" />
              </button>
              <div>
                <p className="font-semibold text-amber-900">
                  Paid for a book but can&apos;t see it here?
                </p>
                <p className="text-sm text-amber-900/80">
                  Use our self-service tool to resolve missing book purchases in
                  a few steps.
                </p>
              </div>
              <Button
                variant="link"
                className="hover:bg-primary w-full border-amber-400 text-amber-900 md:w-auto"
                onClick={() => navigate('/resolve-purchase')}
              >
                Resolve
              </Button>
            </div>
          )}

          {!orderedBooks || orderedBooks.length === 0 ? (
            <div className="border-primary/20 rounded-xl border-2 border-dashed bg-white/30 py-16 text-center">
              <p className="text-muted-foreground mb-4">
                You haven't purchased any books yet.
              </p>
              <Button onClick={() => navigate('/')}>Browse Bookstore</Button>
            </div>
          ) : (
            <div className="space-y-0">
              <div className="flex justify-end">
                {orderedBooks && orderedBooks.length > 0 && (
                  <p className="text-muted-foreground hidden text-sm md:block">
                    <GripVertical className="mr-1 inline h-4 w-4" />
                    Drag books to rearrange
                  </p>
                )}
              </div>
              {shelves.map((shelfBooks, shelfIndex) => (
                <div key={shelfIndex} className="relative">
                  {/* Books on the shelf */}
                  <div
                    className="grid min-h-[180px] grid-cols-2 items-end gap-2 px-2 pb-0 pt-4 sm:grid-cols-4 md:min-h-[220px] md:grid-cols-6 md:gap-3 md:px-6 lg:grid-cols-8"
                    onDragOver={(e) => {
                      e.preventDefault()
                    }}
                  >
                    {shelfBooks.map((book: Book, bookIndex: number) => {
                      const globalIndex = getGlobalIndex(shelfIndex, bookIndex)
                      const isDragging = draggedIndex === globalIndex
                      const isDragOver =
                        hoverIndex === globalIndex && !isDragging
                      const isBorrowed = Boolean(book.isBorrowed)
                      const peerLendRecordId = getPeerLendRecordId(book)
                      const activeLendForBook = myLends.find(
                        (lend) =>
                          lend.status === 'ACTIVE' &&
                          Number(lend.book?.id) === Number(book.id),
                      )
                      const isLentOutNoAccess =
                        !!activeLendForBook &&
                        !activeLendForBook.lenderHasAccess

                      return (
                        <div
                          key={`book-${book.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, globalIndex)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, globalIndex)}
                          onDrop={(e) => handleDrop(e, globalIndex)}
                          className={`group relative cursor-grab transition-all duration-200 hover:z-10 hover:-translate-y-2 active:cursor-grabbing ${
                            isDragging ? 'scale-90 opacity-30' : ''
                          } ${isDragOver ? 'z-20 -translate-y-4' : ''}`}
                          style={{
                            transform: `rotate(${
                              ((bookIndex % 3) - 1) * 1
                            }deg)`,
                          }}
                        >
                          {/* Drop indicator - shows where book will be placed */}
                          {isDragOver && (
                            <div className="bg-primary shadow-primary/50 absolute -left-2 top-0 bottom-0 w-1.5 rounded-full shadow-lg" />
                          )}

                          {/* Book spine/cover */}
                          <div
                            className={`relative mx-auto h-[160px] w-full max-w-[120px] overflow-hidden rounded-r-sm shadow-md transition-all duration-300 group-hover:shadow-xl md:h-[200px] md:max-w-[150px] ${
                              isDragOver
                                ? 'ring-primary ring-2 ring-offset-2'
                                : ''
                            }`}
                            style={{
                              // 3D book effect
                              transformStyle: 'preserve-3d',
                              perspective: '1000px',
                            }}
                            onClick={() => {
                              if (isLentOutNoAccess) return
                              handleReadNow(book.id, book.orderId!)
                            }}
                          >
                            {/* Book cover */}
                            {book.coverImage ? (
                              <img
                                src={book.coverImage}
                                alt={book.title}
                                className="h-full w-full object-cover"
                                style={{
                                  filter: isLentOutNoAccess
                                    ? 'grayscale(80%) brightness(0.7)'
                                    : undefined,
                                }}
                              />
                            ) : (
                              <div
                                className="flex h-full w-full items-center justify-center p-2"
                                style={{
                                  background: `linear-gradient(135deg, ${
                                    [
                                      '#8B4513',
                                      '#A0522D',
                                      '#6B4423',
                                      '#8B6914',
                                      '#704214',
                                    ][bookIndex % 5]
                                  } 0%, ${
                                    [
                                      '#654321',
                                      '#8B4513',
                                      '#5D3A1A',
                                      '#6B5B00',
                                      '#5D3A1A',
                                    ][bookIndex % 5]
                                  } 100%)`,
                                }}
                              >
                                <span
                                  className="writing-vertical line-clamp-4 text-center text-[8px] font-semibold text-white md:text-xs"
                                  style={{
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                  }}
                                >
                                  {book.title}
                                </span>
                              </div>
                            )}

                            {/* Book spine edge (left side 3D effect) */}
                            <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-r from-black/30 to-transparent md:w-[5px]" />

                            {/* Top edge highlight */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-b from-white/20 to-transparent" />

                            {/* Hover overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/20 group-hover:opacity-100">
                              <BookOpen className="h-6 w-6 text-white drop-shadow-lg md:h-8 md:w-8" />
                            </div>

                            {isBorrowed && (
                              <div className="absolute top-1 left-1 rounded-full bg-red-600 px-2 py-0.5 text-[12px] font-semibold text-white shadow-sm shadow-white">
                                Borrowed
                              </div>
                            )}
                            {isLentOutNoAccess && (
                              <div className="absolute top-1 left-1 rounded-full  bg-red-600 px-2 py-0.5 text-[12px] font-semibold text-white shadow-sm shadow-white">
                                Lent Out
                              </div>
                            )}

                            {isLentOutNoAccess && (
                              <div className="bg-black/65 absolute inset-x-0 bottom-0 p-2 text-left text-[13px] font-semibold text-white backdrop-blur-sm">
                                Lent out until{' '}
                                {new Date(
                                  activeLendForBook!.endAt,
                                ).toLocaleDateString()}
                              </div>
                            )}

                            {isBorrowed && book.expiresAt && (
                              <div className="absolute bottom-0 left-0 right-0 gap-1 bg-black/60 p-2 text-[10px] text-white backdrop-blur-sm">
                                <p className="flex items-center gap-1 text-sm">
                                  <Clock className="h-3 w-3" />
                                  {getTimeRemaining(book.expiresAt)}
                                </p>
                                {book.lenderName ? (
                                  <p className="text-xs">
                                    Borrowed from {book.lenderName}
                                  </p>
                                ) : null}
                                {peerLendRecordId ? (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="mt-1 h-7 w-full rounded-full border-white/80 px-2 text-[11px] text-white"
                                    disabled={returnMutation.isPending}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      returnMutation.mutate(peerLendRecordId)
                                    }}
                                  >
                                    {returnMutation.isPending
                                      ? 'Returning...'
                                      : 'Return Book'}
                                  </Button>
                                ) : null}
                              </div>
                            )}

                            {!!lendingConfig?.peer_lending_enabled &&
                              !activeLendForBook &&
                              !isBorrowed && (
                                <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    style={{
                                      color: 'red',
                                      cursor: 'pointer',
                                    }}
                                    className="text-primary h-7 cursor-pointer rounded-full bg-white px-2 text-xs text-red-700 outline outline-red-700 hover:bg-white/90"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setShareBook(book)
                                      setDurationDays(1)
                                      setRecipient('')
                                      setShareOpen(true)
                                    }}
                                  >
                                    Lend Book
                                  </Button>
                                </div>
                              )}
                          </div>

                          {/* Book bottom shadow on shelf */}
                          <div className="mx-[2px] h-[3px] rounded-b-sm bg-gradient-to-t from-black/30 to-transparent" />
                        </div>
                      )
                    })}
                  </div>

                  {/* Wooden shelf */}
                  <div className="relative hidden md:block">
                    {/* Shelf front edge (3D effect) */}
                    <div
                      className="h-[8px] rounded-b-sm md:h-[10px]"
                      style={{
                        background:
                          'linear-gradient(180deg, #5D3A1A 0%, #4A2C14 100%)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
                      }}
                    />

                    {/* Shelf brackets (decorative) */}
                    <div className="absolute -bottom-4 left-4 hidden h-4 w-3 rounded-b-sm bg-gradient-to-b from-amber-700 to-amber-900 shadow-md md:block" />
                    <div className="absolute -bottom-4 right-4 hidden h-4 w-3 rounded-b-sm bg-gradient-to-b from-amber-700 to-amber-900 shadow-md md:block" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Library
