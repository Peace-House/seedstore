import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBookUserAllocations } from '@/hooks/useFreeCopies';
import RecipientsDialog from './RecipientsDialog';

/**
 * Giving history for one book's outreach (user) allocations: each row is an
 * admin→user grant showing total / given-out / remaining. Tapping the given-out
 * number opens the list of recipients that user gave to.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: { bookId: number; title: string } | null;
}

export default function UserGivingHistoryDialog({
  open,
  onOpenChange,
  book,
}: Props) {
  const { data, isLoading } = useBookUserAllocations(
    open && book ? book.bookId : null,
  );
  const allocations = data?.allocations ?? [];
  const [recipientTarget, setRecipientTarget] = useState<{
    allocationId: string;
    label: string;
  } | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Giving history</DialogTitle>
            <DialogDescription>
              {book?.title} — who the books were given to, and how many each
              outreach user has given / has left.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[440px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Total</th>
                  <th className="px-3 py-2 text-left">Given out</th>
                  <th className="px-3 py-2 text-left">Remaining</th>
                  <th className="px-3 py-2 text-left">Granted</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : allocations.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                      No outreach allocations for this book yet.
                    </td>
                  </tr>
                ) : (
                  allocations.map((a) => {
                    const label = a.holderName || a.holderPhcode;
                    return (
                      <tr key={a.allocationId} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{label}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {a.holderPhcode}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono">{a.total}</td>
                        <td className="px-3 py-2">
                          <Button
                            variant="link"
                            className="h-auto p-0 font-mono text-sm"
                            disabled={a.givenOut === 0}
                            onClick={() =>
                              setRecipientTarget({
                                allocationId: a.allocationId,
                                label,
                              })
                            }
                          >
                            {a.givenOut}
                          </Button>
                        </td>
                        <td className="px-3 py-2 font-mono">{a.remaining}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <RecipientsDialog
        open={!!recipientTarget}
        onOpenChange={(o) => !o && setRecipientTarget(null)}
        allocationId={recipientTarget?.allocationId ?? null}
        holderLabel={recipientTarget?.label}
      />
    </>
  );
}
