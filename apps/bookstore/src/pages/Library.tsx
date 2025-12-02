
import { BookOpen } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { useLibrary } from '@/hooks/useLibrary';
import { Book } from '@/services';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/Breadcrumb';
import { PageLoader } from '@/components/Loader';

const Library = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { library: purchasedBooks, isLoading } = useLibrary();

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
  if (purchasedBooks) {
    for (let i = 0; i < purchasedBooks.length; i += booksPerShelf) {
      shelves.push(purchasedBooks.slice(i, i + booksPerShelf));
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="container py-8">
          <Breadcrumb />
          <br />
          <h1 className="text-4xl font-bold mb-8 text-primary">My Library</h1>

          {!purchasedBooks || purchasedBooks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">You haven't purchased any books yet.</p>
              <Button onClick={() => navigate('/')}>Browse Books</Button>
            </div>
          ) : (
            <div className="space-y-0">
              {shelves.map((shelfBooks, shelfIndex) => (
                <div key={shelfIndex} className="relative">
                  {/* Books on the shelf */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 px-2 md:px-6 pb-0 pt-4 min-h-[180px] md:min-h-[220px] items-end">
                    {shelfBooks.map((book: Book, bookIndex: number) => (
                      <div
                        key={book.id}
                        className="group cursor-pointer transform transition-all duration-300 hover:-translate-y-2 hover:z-10"
                        onClick={() => handleReadNow(book.id, book.orderId!)}
                        style={{
                          // Slight random tilt for realism
                          transform: `rotate(${(bookIndex % 3 - 1) * 1}deg)`,
                        }}
                      >
                        {/* Book spine/cover */}
                        <div 
                          className="relative w-full h-[160px] md:h-[200px] rounded-r-sm shadow-md transition-all duration-300 group-hover:shadow-xl overflow-hidden mx-auto max-w-[120px] md:max-w-[150px]"
                          style={{
                            // 3D book effect
                            transformStyle: 'preserve-3d',
                            perspective: '1000px',
                          }}
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
                    ))}
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
