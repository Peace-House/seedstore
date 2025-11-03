import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getLibraryAccess } from '@/services/library';
import { Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import BookReader from '@/components/BookReader';
import MultiBookReader from '@/components/MultiBookReader';
import MyBookReader from '@/components/BookReaders/MyBookReader';
import { useRef } from 'react'
import {
  EpubViewer,
  ReactEpubViewer
} from 'react-epub-viewer';

const Reader = () => {
    const viewerRef = useRef(null);

  const { orderId, bookId } = useParams<{ orderId: string; bookId: string }>();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [bookUrl, setBookUrl] = useState<string>('');

  const { data: accessData, isLoading } = useQuery({
    queryKey: ['book-access', orderId, bookId, user?.id],
    queryFn: async () => {
      if (!user || !orderId || !bookId) return { hasAccess: false, fileUrl: '' };
      return await getLibraryAccess(orderId, bookId);
    },
    enabled: !!user && !!orderId && !!bookId,
  });

  useEffect(() => {
    if (accessData?.fileUrl) {
      setBookUrl(accessData.fileUrl);
    }
  }, [accessData]);

  useEffect(() => {
    if (!isLoading && accessData && !accessData.hasAccess) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have access to this book.',
      });
    }
  }, [accessData, isLoading, toast]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (accessData && !accessData.hasAccess) {
    return <Navigate to="/library" replace />;
  }

  console.log('Book URL:', bookUrl);
  return (
    <>
   { accessData.format === 'epub' ?
  //  <BookReader />

  //  <MyBookReader
  //     bookUrl={accessData.fileUrl}
  //     // bookFormat={accessData.format}
  //     bookId={bookId || ''}
  //   />
  <div style={{ position: "relative", height: "100%" }}>
      <ReactEpubViewer 
        url={accessData.fileUrl}
        ref={viewerRef}
      />
    </div>

  // <MultiBookReader books={[{ url: bookUrl, format: accessData.format }]} />
   
   :<div className="min-h-screen bg-background">
      <div className="h-screen w-full">
        {accessData.format === 'pdf' ? (
          <iframe
            src={bookUrl}
            className="w-full h-full border-0"
            title="Book Reader"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                EPUB reader not yet implemented. Download the book to read it.
              </p>
              <a
                href={bookUrl}
                download
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Download Book
              </a>
            </div>
          </div>
        )}
      </div>
    </div>}
    </>
  );
};

export default Reader;
