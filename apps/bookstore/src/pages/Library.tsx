
import { BookOpen, GripVertical } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useLibrary } from '@/hooks/useLibrary';
import { Book } from '@/services';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/Breadcrumb';
import { PageLoader } from '@/components/Loader';

const LIBRARY_ORDER_KEY = 'library_book_order';

const Library = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { library: purchasedBooks, isLoading } = useLibrary();
  
  // State for ordered books and drag-and-drop
  const [orderedBooks, setOrderedBooks] = useState<Book[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Load saved order from localStorage and apply to books
  useEffect(() => {
    if (purchasedBooks && purchasedBooks.length > 0) {
      const savedOrder = localStorage.getItem(LIBRARY_ORDER_KEY);
      if (savedOrder) {
        try {
          const orderIds: (number | string)[] = JSON.parse(savedOrder);
          const sorted = [...purchasedBooks].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
          setOrderedBooks(sorted);
        } catch {
          setOrderedBooks([...purchasedBooks]);
        }
      } else {
        setOrderedBooks([...purchasedBooks]);
      }
    }
  }, [purchasedBooks]);

  // Save order to localStorage
  const saveOrder = useCallback((books: Book[]) => {
    const orderIds = books.map(book => book.id);
    localStorage.setItem(LIBRARY_ORDER_KEY, JSON.stringify(orderIds));
  }, []);

  // Move book within ordered list using array indexes - simple reorder
  const moveBook = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setOrderedBooks(prevBooks => {
      if (prevBooks.length === 0) return prevBooks;
      if (fromIndex < 0 || fromIndex >= prevBooks.length) return prevBooks;
      if (toIndex < 0 || toIndex >= prevBooks.length) return prevBooks;

      // Create new array and reorder
      const newBooks = Array.from(prevBooks);
      const [removed] = newBooks.splice(fromIndex, 1);
      newBooks.splice(toIndex, 0, removed);
      
      // Verify no duplicates
      const ids = new Set(newBooks.map(b => b.id));
      if (ids.size !== newBooks.length) {
        console.error('Duplicate detected, reverting');
        return prevBooks;
      }
      
      saveOrder(newBooks);
      return newBooks;
    });
  }, [saveOrder]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setHoverIndex(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));

    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedIndex(null);
    setHoverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number | null) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (index === null) {
      if (hoverIndex !== null) setHoverIndex(null);
      return;
    }

    if (hoverIndex !== index) {
      setHoverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setHoverIndex(null);
      return;
    }

    moveBook(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setHoverIndex(null);
  };

  const getGlobalIndex = (shelfIndex: number, bookIndex: number) => shelfIndex * booksPerShelf + bookIndex;

  if (loading || isLoading) {
    return (
      <>
        <PageLoader />
      </>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  const handleReadNow = (bookId: number | string, orderId: string) => {
    const reader_route = import.meta.env.VITE_BOOKREADER_URL!;
    const token = localStorage.getItem('auth_token');
    const url = `${reader_route}?bookId=${bookId}&orderId=${orderId}${token ? `&auth_token=${encodeURIComponent(token)}` : ''}`;
    window.location.href = url;
  }

  // Group books into shelves (8 books per shelf on large, 6 on md, 4 on tablet, 2 on mobile)
  // Using 8 as the max for grouping, CSS will handle responsive display
  const booksPerShelf = 8;
  const shelves: Book[][] = [];
  if (orderedBooks && orderedBooks.length > 0) {
    for (let i = 0; i < orderedBooks.length; i += booksPerShelf) {
      shelves.push(orderedBooks.slice(i, i + booksPerShelf));
    }
  }


  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="container py-8">
          <Breadcrumb />
          <br />
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-primary">My Library</h1>
            {orderedBooks && orderedBooks.length > 0 && (
              <p className="text-sm text-muted-foreground hidden md:block">
                <GripVertical className="inline w-4 h-4 mr-1" />
                Drag books to rearrange
              </p>
            )}
          </div>

          {!orderedBooks || orderedBooks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">You haven't purchased any books yet.</p>
              <Button onClick={() => navigate('/')}>Browse Books</Button>
            </div>
          ) : (
            <div className="space-y-0">
              {shelves.map((shelfBooks, shelfIndex) => (
                <div key={shelfIndex} className="relative">
                  {/* Books on the shelf */}
                  <div
                    className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 px-2 md:px-6 pb-0 pt-4 min-h-[180px] md:min-h-[220px] items-end"
                    onDragOver={(e) => { e.preventDefault(); }}
                  >
                    {shelfBooks.map((book: Book, bookIndex: number) => {
                      const globalIndex = getGlobalIndex(shelfIndex, bookIndex);
                      const isDragging = draggedIndex === globalIndex;
                      const isDragOver = hoverIndex === globalIndex && !isDragging;

                      return (
                        <div
                          key={`book-${book.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, globalIndex)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, globalIndex)}
                          onDrop={(e) => handleDrop(e, globalIndex)}
                          className={`group cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-2 hover:z-10 relative ${
                            isDragging ? 'opacity-30 scale-90' : ''
                          } ${isDragOver ? '-translate-y-4 z-20' : ''}`}
                          style={{
                            transform: `rotate(${(bookIndex % 3 - 1) * 1}deg)`,
                          }}
                        >
                          {/* Drop indicator - shows where book will be placed */}
                          {isDragOver && (
                            <div className="absolute -left-2 top-0 bottom-0 w-1.5 bg-primary rounded-full shadow-lg shadow-primary/50" />
                          )}
                          
                          {/* Book spine/cover */}
                          <div 
                            className={`relative w-full h-[160px] md:h-[200px] rounded-r-sm shadow-md transition-all duration-300 group-hover:shadow-xl overflow-hidden mx-auto max-w-[120px] md:max-w-[150px] ${
                              isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''
                            }`}
                            style={{
                              // 3D book effect
                              transformStyle: 'preserve-3d',
                              perspective: '1000px',
                            }}
                            onClick={() => handleReadNow(book.id, book.orderId!)}
                          >
                          {/* Book cover */}
                          {book.coverImage ? (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center p-2"
                              style={{
                                background: `linear-gradient(135deg, ${['#8B4513', '#A0522D', '#6B4423', '#8B6914', '#704214'][bookIndex % 5]} 0%, ${['#654321', '#8B4513', '#5D3A1A', '#6B5B00', '#5D3A1A'][bookIndex % 5]} 100%)`,
                              }}
                            >
                              <span className="text-white text-[8px] md:text-xs font-semibold text-center writing-vertical line-clamp-4"
                                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                              >
                                {book.title}
                              </span>
                            </div>
                          )}
                          
                          {/* Book spine edge (left side 3D effect) */}
                          <div 
                            className="absolute left-0 top-0 w-[3px] md:w-[5px] h-full bg-gradient-to-r from-black/30 to-transparent"
                          />
                          
                          {/* Top edge highlight */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-b from-white/20 to-transparent"
                          />
                          
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                        
                        {/* Book bottom shadow on shelf */}
                        <div className="h-[3px] bg-gradient-to-t from-black/30 to-transparent mx-[2px] rounded-b-sm" />
                      </div>
                      );
                    })}
                  </div>
                  
                  {/* Wooden shelf */}
                  <div className="relative hidden md:block">
                    
                    {/* Shelf front edge (3D effect) */}
                    <div 
                      className="h-[8px] md:h-[10px] rounded-b-sm"
                      style={{
                        background: 'linear-gradient(180deg, #5D3A1A 0%, #4A2C14 100%)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
                      }}
                    />
                    
                    {/* Shelf brackets (decorative) */}
                    <div className="absolute -bottom-4 left-4 w-3 h-4 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-sm shadow-md hidden md:block" />
                    <div className="absolute -bottom-4 right-4 w-3 h-4 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-sm shadow-md hidden md:block" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Library;
