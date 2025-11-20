import { useAuth } from '@/hooks/useAuth';
import { BookOpen } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

import { Book } from '@/services';
// import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useLibrary } from '@/hooks/useLibrary';
import Breadcrumb from '@/components/Breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
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

  return (
    <>
      {/* <Navbar /> */}
      <div className="container py-8 min-h-screen">
        <Breadcrumb /> {/* go to home and scroll to all books  */}
        <br />
        <h1 className="text-4xl font-bold mb-8">My Library</h1>

        {!purchasedBooks || purchasedBooks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">You haven't purchased any books yet.</p>
            <Button onClick={() => navigate('/')}>Browse Books</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-8 gap-8 py-3 bookshelf-bg">
            {purchasedBooks.map((book: Book) => (
              <div key={book.id} className="flex flex-col items-center"
                onClick={() => handleReadNow(book.id, book.orderId!)}
              >
                <div className="relative w-32 h-48 mb-4 shadow-lg  overflow-hidden bg-muted group">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="text-3xl font-bold text-muted-foreground">
                        {book.title[0]}
                      </span>
                    </div>
                  )}
                </div>
                {/* <Button
                  className="w-28 font-normal text-sm !bg-none !shadow-none"
                  size="sm"
                  variant='link'
                  onClick={() => handleReadNow(book.id, book.orderId!)}
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Read Now
                </Button> */}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Library;
