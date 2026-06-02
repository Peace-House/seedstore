import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateUserAllocation } from '@/hooks/useFreeCopies';
import { freeCopyErr, listAuthorsFreeCopies } from '@/services/adminFreeCopies';

/**
 * Give an outreach user a per-book free-copy quota they can redistribute.
 * Pick a book (search), enter the user's PHCode + how many copies.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateUserAllocationDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [phcode, setPhcode] = useState('');
  const [total, setTotal] = useState<number>(50);

  const create = useCreateUserAllocation();

  useEffect(() => {
    if (open) {
      setBookQuery('');
      setSelectedBook(null);
      setPhcode('');
      setTotal(50);
    }
  }, [open]);

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['fc-book-search', bookQuery],
    queryFn: () => listAuthorsFreeCopies({ q: bookQuery.trim(), pageSize: 8 }),
    enabled: open && !selectedBook && bookQuery.trim().length >= 2,
  });
  const results = searchData?.books ?? [];

  const handleSubmit = async () => {
    if (!selectedBook) {
      toast({ variant: 'destructive', title: 'Pick a book first' });
      return;
    }
    const code = phcode.trim().toUpperCase();
    if (!code) {
      toast({ variant: 'destructive', title: 'Enter a PHCode' });
      return;
    }
    if (!Number.isFinite(total) || total < 1) {
      toast({ variant: 'destructive', title: 'Enter a positive number of copies' });
      return;
    }
    try {
      const res = await create.mutateAsync({
        bookId: selectedBook.id,
        phcode: code,
        total,
      });
      toast({
        title: 'Free copies granted',
        description: `${code} can now give out ${res.allocation.total} copies of "${selectedBook.title}".`,
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not grant copies',
        description: freeCopyErr(e),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give free copies to a user</DialogTitle>
          <DialogDescription>
            Grant an outreach user a quota of free copies of a book that they
            can then give out to other users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Book</Label>
            {selectedBook ? (
              <div className="mt-1 flex items-center justify-between rounded-md border p-2">
                <span className="truncate text-sm font-medium">
                  {selectedBook.title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setSelectedBook(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Input
                  className="mt-1"
                  placeholder="Search book by title or author"
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                />
                {bookQuery.trim().length >= 2 && (
                  <div className="mt-1 max-h-44 overflow-y-auto rounded-md border">
                    {isFetching ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Searching…
                      </div>
                    ) : results.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No books found
                      </div>
                    ) : (
                      results.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setSelectedBook({ id: b.id, title: b.title })
                          }
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <span className="font-medium">{b.title}</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {b.author}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <Label htmlFor="user-phcode">Recipient user PHCode</Label>
            <Input
              id="user-phcode"
              className="mt-1 font-mono"
              placeholder="PH123456"
              value={phcode}
              onChange={(e) => setPhcode(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <Label htmlFor="user-total">Number of free copies</Label>
            <Input
              id="user-total"
              type="number"
              min={1}
              className="mt-1"
              value={total}
              onChange={(e) =>
                setTotal(
                  e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                )
              }
            />
            <Badge variant="secondary" className="mt-2">
              The user can give these out from the mobile app
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? 'Granting…' : 'Grant copies'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
