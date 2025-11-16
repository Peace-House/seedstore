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
  const handleReadNow = (bookId: number|string, orderId:string) => {
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {purchasedBooks.map((book: Book) => (
              <Card key={book.id} className="overflow-hidden bg-white rounded h-[240px] flex flex-col group hover:shadow-lg transition-shadow shadow-none border">
                <div className="relative h-[140px] w-full overflow-hidden bg-muted">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="text-2xl font-bold text-muted-foreground">
                        {book.title[0]}
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{book.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                  </div>
                  <Button
                    className="w-full mt-2"
                    size="sm"
                    onClick={() => handleReadNow(book.id, book.orderId!)}
                    // onClick={() => navigate(`/reader?orderId=${book.orderId}&bookId=${book.id}`)}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Read Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Library;
