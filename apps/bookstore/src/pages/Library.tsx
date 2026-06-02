import {
  BookOpen,
  GripVertical,
  Clock,
  AlertTriangle,
  X,
  Layers,
  LayoutGrid,
} from 'lucide-react'
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
// Stack-vs-grid view preference. Defaults to 'stack' on first
// load so a user lands on the bookshelf treatment — matching
// the mobile default. Persisted across sessions so anyone who
// picks 'grid' stays there.
const LIBRARY_VIEW_MODE_KEY = 'library_view_mode_v1'
type LibraryViewMode = 'stack' | 'grid'

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
  // View mode (stack | grid) hydrated from localStorage. Stack
  // is the default — mirrors the mobile library's bookshelf
  // first impression. Only an explicit pick of 'grid' switches
  // away.
  const [viewMode, setViewMode] = useState<LibraryViewMode>(() => {
    const stored = localStorage.getItem(LIBRARY_VIEW_MODE_KEY)
    return stored === 'grid' ? 'grid' : 'stack'
  })
  const handleSetViewMode = useCallback((next: LibraryViewMode) => {
    setViewMode(next)
    localStorage.setItem(LIBRARY_VIEW_MODE_KEY, next)
  }, [])

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

  // Group books into shelves. Both views render their shelf
  // sized exactly to fit the books — 10 overlapping covers in
  // stack mode, 5 standalone covers in grid. The wrapping
  // container uses w-fit + mx-auto so the shelf reads as a
  // centred bookcase row regardless of viewport width.
  const booksPerShelf = viewMode === 'stack' ? 10 : 5
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
            // Gap between shelves — books and the next shelf above
            // shouldn't share a seam. ~32px breathing room reads as
            // separate shelves of a bookcase rather than one
            // continuous wood slab.
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                {/* Stack / Grid view toggle. Mirrors the mobile
                    library's view switcher — same default
                    (stack), same persistence behaviour. */}
                <div className="inline-flex rounded-full border border-amber-300 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    aria-pressed={viewMode === 'stack'}
                    onClick={() => handleSetViewMode('stack')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                      viewMode === 'stack'
                        ? 'bg-amber-700 text-white shadow-sm'
                        : 'text-amber-900 hover:bg-amber-50'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" /> Stack
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => handleSetViewMode('grid')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                      viewMode === 'grid'
                        ? 'bg-amber-700 text-white shadow-sm'
                        : 'text-amber-900 hover:bg-amber-50'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Grid
                  </button>
                </div>
                {orderedBooks && orderedBooks.length > 0 && (
                  <p className="text-muted-foreground hidden text-sm md:block">
                    <GripVertical className="mr-1 inline h-4 w-4" />
                    Drag books to rearrange
                  </p>
                )}
              </div>
              {shelves.map((shelfBooks, shelfIndex) => (
                // `w-fit + mx-auto` collapses the shelf to its
                // content width (exactly the books it holds) and
                // centres it horizontally on the page. The plank
                // and brackets below are children of this wrapper
                // so they inherit the same compact width.
                <div
                  key={shelfIndex}
                  className="relative mx-auto w-fit"
                >
                  {/* Books on the shelf. Both views are flex rows
                      now — stack uses negative left margins so
                      each cover overlaps the previous one by half
                      its width; grid uses a positive gap so covers
                      sit side-by-side. Either way, the container's
                      intrinsic width is the sum of the contents,
                      which is what the surrounding w-fit reads. */}
                  <div
                    className={
                      viewMode === 'stack'
                        ? 'flex min-h-[180px] items-end pt-4 md:min-h-[220px]'
                        : 'flex min-h-[180px] items-end gap-2 pt-4 sm:gap-3 md:min-h-[220px]'
                    }
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

                      // Both views give every book an explicit
                      // width so the parent's w-fit can size the
                      // shelf exactly to its contents:
                      //   • mobile: 60px
                      //   • sm:     90px
                      //   • md:    120px
                      //   • lg:    150px
                      // Stack additionally pulls each book after
                      // the first left by half a width to overlap
                      // the previous cover; grid leaves the gap
                      // class on the parent to space them out.
                      // Stack total: W·5.5 (10 books); grid total:
                      // W·5 + 4·gap (5 books).
                      const bookSizing =
                        'shrink-0 w-[60px] sm:w-[90px] md:w-[120px] lg:w-[150px]'
                      const stackOverlapPull =
                        viewMode === 'stack' && bookIndex > 0
                          ? '-ml-[30px] sm:-ml-[45px] md:-ml-[60px] lg:-ml-[75px]'
                          : ''
                      const stackBookSizing = `${bookSizing} ${stackOverlapPull}`
                      return (
                        <div
                          key={`book-${book.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, globalIndex)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, globalIndex)}
                          onDrop={(e) => handleDrop(e, globalIndex)}
                          className={`group relative cursor-grab transition-all duration-200 hover:z-10 hover:-translate-y-2 active:cursor-grabbing ${stackBookSizing} ${
                            isDragging ? 'scale-90 opacity-30' : ''
                          } ${isDragOver ? 'z-20 -translate-y-4' : ''}`}
                        >
                          {/* Drop indicator - shows where book will be placed */}
                          {isDragOver && (
                            <div className="bg-primary shadow-primary/50 absolute -left-2 top-0 bottom-0 w-1.5 rounded-full shadow-lg" />
                          )}

                          {/* Book spine/cover. Both views use the
                              7:10 standard book aspect ratio on a
                              w-full cover, so the cover height is
                              driven by the parent's fixed width
                              (60–150px depending on breakpoint).
                              Keeps the proportions consistent
                              between grid and stack — only the
                              parent layout changes between them. */}
                          <div
                            className={`relative mx-auto aspect-[7/10] w-full overflow-hidden rounded-r-sm shadow-md transition-all duration-300 group-hover:shadow-xl ${
                              isDragOver
                                ? 'ring-primary ring-2 ring-offset-2'
                                : ''
                            }`}
                            style={{
                              // 3D book effect
                              transformStyle: 'preserve-3d',
                              perspective: '1000px',
                              // Stack-view seam shadow — only on
                              // books that sit on top of another.
                              // Without it, two adjacent overlapping
                              // covers blur together. Composed with
                              // the existing card shadow so we don't
                              // lose the lift effect.
                              boxShadow:
                                viewMode === 'stack' && bookIndex > 0
                                  ? '0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10), -4px 0 6px -1px rgba(0,0,0,0.45)'
                                  : undefined,
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

                            {/*
                              "Continue reading" overlay for purchased,
                              non-borrowed, non-lent-out books that have
                              actual progress. Skipped for the borrowed and
                              lent-out cases — those already own the bottom
                              strip with their own overlays. The matching
                              mobile card uses the same wording and shape.
                            */}
                            {!isBorrowed &&
                              !isLentOutNoAccess &&
                              (book.percentage ?? 0) > 0 && (
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm">
                                  <div className="flex items-center justify-between px-2 py-1 text-[10px] text-white">
                                    <span>Continue reading</span>
                                    <span className="font-semibold">
                                      {Math.round(book.percentage ?? 0)}%
                                    </span>
                                  </div>
                                  <div
                                    className="h-[3px] w-full bg-white/20"
                                    aria-hidden
                                  >
                                    <div
                                      className="h-full bg-white"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(0, book.percentage ?? 0),
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                            {isBorrowed && book.expiresAt && (
                              <div className="absolute bottom-0 left-0 right-0 gap-1 bg-black/60 p-2 text-[10px] text-white backdrop-blur-sm">
                                <p className="flex items-center gap-1 text-lg">
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

                  {/* Wooden shelf. Stack view's overlap layout
                      fits on one row at every breakpoint, so the
                      plank is shown on all sizes. Grid view still
                      hides the plank on mobile because the cells
                      wrap into multiple visual rows and a single
                      plank at the bottom would look stranded. */}
                  <div
                    className={
                      viewMode === 'stack'
                        ? 'relative block'
                        : 'relative hidden md:block'
                    }
                  >
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
                    <div
                      className={`absolute -bottom-4 left-4 h-4 w-3 rounded-b-sm bg-gradient-to-b from-amber-700 to-amber-900 shadow-md ${
                        viewMode === 'stack' ? 'block' : 'hidden md:block'
                      }`}
                    />
                    <div
                      className={`absolute -bottom-4 right-4 h-4 w-3 rounded-b-sm bg-gradient-to-b from-amber-700 to-amber-900 shadow-md ${
                        viewMode === 'stack' ? 'block' : 'hidden md:block'
                      }`}
                    />
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
