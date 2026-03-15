import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Breadcrumb from '@/components/Breadcrumb';
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { ResolvePurchaseIssueInput, resolvePurchaseIssue } from '@/services/order';
import { Book, getBooks } from '@/services/book';
import { hasValidPricing } from '@/utils/pricing';

const ResolvePurchaseIssue = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState(user?.email ?? '');
  const [paymentReference, setPaymentReference] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        setBooksError(null);
        const res = await getBooks(1, 200);
        const valid = res.books.filter((b) => hasValidPricing(b.prices));
        setBooks(valid);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load books. You can still describe the book below.';
        setBooksError(message);
      } finally {
        setLoadingBooks(false);
      }
    };

    fetchBooks();
  }, []);

  const mutation = useMutation({
    mutationFn: async (payload: ResolvePurchaseIssueInput) => {
      return await resolvePurchaseIssue(payload);
    },
    onSuccess: (data) => {
      if (data.result === 'auto_resolved') {
        toast({
          title: 'Issue resolved',
          description: data.message || 'Your book has been added to your library.',
        });
        navigate('/library');
      } else {
        toast({
          title: 'We are on it',
          description:
            data.message ||
            'We could not automatically resolve this, but our team has been notified and will review your request.',
        });
      }
    },
    onError: (error: unknown) => {
      // Prefer short, user-friendly message from backend if available
      const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
      const backendMessage =
        axiosError?.response?.data?.error || axiosError?.response?.data?.message;
      const message =
        typeof backendMessage === 'string'
          ? backendMessage
          : error instanceof Error
            ? error.message
            : 'Could not submit your request. Please try again.';
      toast({
        variant: 'destructive',
        title: 'Could not resolve purchase',
        description: message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !paymentReference.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please provide your email and payment reference.',
      });
      return;
    }

    if (!selectedBookIds.length) {
      toast({
        variant: 'destructive',
        title: 'Missing books',
        description: 'Please select at least one book you purchased.',
      });
      return;
    }

    const payload: ResolvePurchaseIssueInput = {
      email: email.trim(),
      paymentReference: paymentReference.trim(),
      bookIds: selectedBookIds,
    };

    mutation.mutate(payload);
  };

  return (
    <div className="container mt-8 pb-16">
      <Breadcrumb />
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Resolve book purchase issue</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        If you successfully paid for a book but it is not showing in your library, use this page to
        submit your payment details. We will try to automatically resolve it, and if that is not
        possible, our team will review your request.
      </p>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <LiquidGlassWrapper className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!user}
                  placeholder="you@example.com"
                  required
                />
                {user && (
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll use your logged-in email for this request.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Payment reference</Label>
                <Input
                  id="reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. LS_1234567890 or Paystack reference"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You can find this on your payment receipt or bank/SMS alert.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="books">Book(s) you purchased</Label>
                <select
                  id="books"
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    const id = Number(value);
                    if (!Number.isNaN(id) && !selectedBookIds.includes(id)) {
                      setSelectedBookIds((prev) => [...prev, id]);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">Select a book</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                      {book.author ? ` – ${book.author}` : ''}
                    </option>
                  ))}
                </select>
                {loadingBooks && (
                  <p className="text-xs text-muted-foreground">Loading books...</p>
                )}
                {booksError && (
                  <p className="text-xs text-red-500">{booksError}</p>
                )}
              </div>

              {selectedBookIds.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected books</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedBookIds.map((id) => {
                      const book = books.find((b) => Number(b.id) === id);
                      if (!book) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded-full border border-input bg-background px-3 py-1 text-xs"
                        >
                          <span className="truncate max-w-[160px]">
                            {book.title}
                            {book.author ? ` – ${book.author}` : ''}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setSelectedBookIds((prev) => prev.filter((bookId) => bookId !== id))
                            }
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground">
                By submitting, you agree that we may use these details to verify your payment with
                our payment partners.
              </p>
              <Button liquidGlass={false} type="submit" disabled={mutation.isPending || !email.trim() || !paymentReference.trim() || !selectedBookIds.length}>
                {mutation.isPending ? 'Submitting...' : 'Resolve issue'}
              </Button>
            </div>
          </form>
        </LiquidGlassWrapper>

        <div className="space-y-4">
          <LiquidGlassWrapper className="p-4 text-sm space-y-3">
            <h2 className="text-base font-semibold">When to use this page</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>You were debited or have a successful payment receipt.</li>
              <li>One or more books from that payment are missing in your library.</li>
              <li>You can remember the email you used during checkout and at least one book you bought.</li>
            </ul>
          </LiquidGlassWrapper>

          <LiquidGlassWrapper className="p-4 text-sm space-y-3">
            <h2 className="text-base font-semibold">Tips for faster resolution</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Copy the exact payment reference from your bank alert, SMS, or receipt.</li>
              <li>Use the same email address you entered on the payment page.</li>
              <li>Select all the books you paid for in that single transaction.</li>
            </ul>
          </LiquidGlassWrapper>
        </div>
      </div>
    </div>
  );
};

export default ResolvePurchaseIssue;

