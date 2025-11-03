import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBookById } from '@/services/book';
import api from '@/services/apiService';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, BookOpen, Loader2, Calendar, FileText, Hash, Download, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import RelatedBooks from '@/components/RelatedBooks';
import Breadcrumb from '@/components/Breadcrumb';
import { PageLoader } from '@/components/Loader';

const BookDetail = () => {
  const { id: slugId } = useParams();
  // Extract id from slug-id
  const id = slugId?.split('-').pop();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart, isAddingToCart } = useCart();

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      if (!id) return null;
      return await getBookById(id);
    },
  });

  const { data: hasPurchased } = useQuery({
    queryKey: ['has-purchased', user?.id, id],
    queryFn: async () => {
      if (!user || !id) return false;
      // Replace with backend API call for purchase status
      const res = await api.get(`/library/has-purchased/${id}`);
      return !!res.data?.purchased;
    },
    enabled: !!user && !!id,
  });

  const handleAddToCart = () => {
    addToCart(book, {
      onSuccess: () => {
        toast({
          title: 'Added to cart',
          description: 'Book has been added to your cart.',
        });
        navigate('/cart');
      },
      onError: (error: Error) => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message?.includes('duplicate')
            ? 'This book is already in your cart'
            : 'Failed to add to cart',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="container py-16 flex justify-center">
          <PageLoader />
        </div>
      </>
    );
  }

  if (!book) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Book not found</h1>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </>
    );
  }

  const handleDownload = () => {
    const url = book.fileUrl;
    if (!url) {
      toast({
        variant: 'destructive',
        title: 'Download unavailable',
        description: 'No file available for this book.',
      });
      return;
    }
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = book.title + '.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Download started',
      description: `Downloading ${book.title}.`,
    });
  };

  console.log('Book Detail:', book);
  return (
    <>
      {/* <Navbar /> */}
      <div className="container pt-8 pb-16 min-h-screen">
        <Breadcrumb />
        <br />
        <div className="grid lg:grid-cols-2 gap-12">
            <div className="aspect-[3.5/4] rounded-lg overflow-hidden shadow-2xl bg-muted md:sticky top-20">
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <span className="text-8xl font-bold text-muted-foreground">
                    {book.title[0]}
                  </span>
                </div>
              )}
            </div>
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">by {book.author}</p>
              {book.category && (
                <Badge className="mb-4">{book.category?.name}</Badge>
              )}
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-primary">
                ₦{Number(book.price).toLocaleString()}
              </span>
            </div>

            {hasPurchased || book.price === 0 ? (
              <div className='flex flex-col md:flex-row md:items-center gap-4'>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => navigate(`/reader/${book.orderId}/${book.id}`)}
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Read Now
                </Button>
                <Button
                  size="sm"
                  variant='outline'
                  onClick={handleDownload}
                  disabled={isAddingToCart}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>

              </div>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingCart className="mr-2 h-5 w-5" />
                )}
                Add to Cart
              </Button>
            )}

            {book.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">About this book</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {book.description}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="text-2xl font-bold mb-4">Details</h2>
                {book.ISBN ? (
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">ISBN</div>
                      <div className="font-medium">{book.ISBN}</div>
                    </div>
                  </div>
                ) : null}
                
                {/* )} */}
                {book.publishedDate ? (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Published</div>
                      <div className="font-medium">
                        {new Date(book.publishedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ) : null}
                {book.pages && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Pages</div>
                      <div className="font-medium">{book.pages}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      {/* related books */}
      {book.category?.id && (
        <div className="mt-32 mb-10">
          <RelatedBooks categoryId={book.category.id} excludeBookId={book.id} showActions={false}  />
        </div>
      )}
      </div>

    </>
  );
};

export default BookDetail;
