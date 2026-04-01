import { BookOpen, GripVertical, Clock, AlertTriangle } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { useLibrary } from '@/hooks/useLibrary'
import { Book } from '@/services'
import { Button } from '@/components/ui/button'
import Breadcrumb from '@/components/Breadcrumb'
import { PageLoader } from '@/components/Loader'

const LIBRARY_ORDER_KEY = 'library_book_order'

const Library = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const { library: purchasedBooks, isLoading } = useLibrary()

  // State for ordered books and drag-and-drop
  const [orderedBooks, setOrderedBooks] = useState<Book[]>([])
  const [borrowedBooks, setBorrowedBooks] = useState<Book[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [now, setNow] = useState(new Date())

  // Update "now" every minute for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Load saved order from localStorage and apply to books
  useEffect(() => {
    if (purchasedBooks && Array.isArray(purchasedBooks)) {
      // Split library into purchased and borrowed
      const borrowed = purchasedBooks.filter((b) => b.isBorrowed)
      const purchased = purchasedBooks.filter((b) => !b.isBorrowed)

      setBorrowedBooks(borrowed)

      const savedOrder = localStorage.getItem(LIBRARY_ORDER_KEY)
      if (savedOrder) {
        try {
          const orderIds: (number | string)[] = JSON.parse(savedOrder)
          const sorted = [...purchased].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id)
            const indexB = orderIds.indexOf(b.id)
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
          })
          setOrderedBooks(sorted)
        } catch {
          setOrderedBooks([...purchased])
        }
      } else {
        setOrderedBooks([...purchased])
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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="container py-8">
          <Breadcrumb />
          <br />
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-primary text-4xl font-bold">My Library</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/manage-group-buy')}
              >
                Manage Group Buy
              </Button>
              {orderedBooks && orderedBooks.length > 0 && (
                <p className="text-muted-foreground hidden text-sm md:block">
                  <GripVertical className="mr-1 inline h-4 w-4" />
                  Drag books to rearrange
                </p>
              )}
            </div>
          </div>

          {/* Borrowed Books Section */}
          {borrowedBooks.length > 0 && (
            <div className="mb-12">
              <h2 className="text-primary mb-6 flex items-center gap-2 text-2xl font-bold">
                <Clock className="h-6 w-6" />
                Borrowed Books
              </h2>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {borrowedBooks.map((book) => (
                  <div key={book.id} className="group space-y-3">
                    <div
                      className="relative aspect-[2/3] cursor-pointer overflow-hidden rounded-lg shadow-md transition-all group-hover:shadow-xl"
                      onClick={() => handleReadNow(book.id, book.orderId!)}
                    >
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex h-full w-full items-center justify-center p-4 text-center text-xs font-bold">
                          {book.title}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <BookOpen className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-black/60 p-2 text-[10px] text-white backdrop-blur-sm">
                        <Clock className="h-3 w-3" />
                        {getTimeRemaining(book.expiresAt!)}
                      </div>
                    </div>
                    <div>
                      <h3 className="line-clamp-1 text-sm font-bold">
                        {book.title}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {book.author}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase issue awareness banner */}
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-amber-900">
                Paid for a book but can&apos;t see it here?
              </p>
              <p className="text-sm text-amber-900/80">
                Use our self-service tool to resolve missing book purchases in a
                few steps.
              </p>
            </div>
            <Button
              variant="outline"
              className="hover:bg-primary w-full border-amber-400 text-amber-900 md:w-auto"
              onClick={() => navigate('/resolve-purchase')}
            >
              Resolve book purchase
            </Button>
          </div>

          {!orderedBooks || orderedBooks.length === 0 ? (
            <div className="border-primary/20 rounded-xl border-2 border-dashed bg-white/30 py-16 text-center">
              <p className="text-muted-foreground mb-4">
                You haven't purchased any books yet.
              </p>
              <Button onClick={() => navigate('/')}>Browse Bookstore</Button>
            </div>
          ) : (
            <div className="space-y-0">
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
                            onClick={() =>
                              handleReadNow(book.id, book.orderId!)
                            }
                          >
                            {/* Book cover */}
                            {book.coverImage ? (
                              <img
                                src={book.coverImage}
                                alt={book.title}
                                className="h-full w-full object-cover"
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
