import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Book } from "@/services/book";
import { Clock, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BorrowModalProps {
  book: Book;
  eligibility: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const BorrowModal = ({
  book,
  eligibility,
  isOpen,
  onOpenChange,
  onConfirm,
  isLoading,
}: BorrowModalProps) => {
  const isEligible = eligibility?.eligible !== false;
  
  const getCountdown = () => {
    if (!eligibility?.resetDate) return null;
    try {
      return formatDistanceToNow(new Date(eligibility.resetDate), { addSuffix: true });
    } catch (e) {
      return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Read Free for {book.lendDurationDays} Days
          </DialogTitle>
          <DialogDescription>
            Learn how book lending works at Living Seed Bookstore.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Lending Duration</p>
                <p className="text-xs text-muted-foreground">
                  Enjoy full access to this book for <b>{book.lendDurationDays} days</b>. Once the period ends, it will automatically be removed from your active library.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Borrowing Quota</p>
                <p className="text-xs text-muted-foreground">
                  To ensure everyone has access, you can borrow up to <b>{book.quotaLimit} books</b> every <b>{book.quotaPeriodDays} days</b>.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded border border-primary/10">
            <p className="font-semibold mb-1">How it works:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click "Continue to Borrow" to add the book to your library instantly.</li>
              <li>Read online or offline via our reader applications.</li>
              <li>No charges apply for borrowed books.</li>
            </ul>
          </div>

          {!isEligible && (
            <div className="bg-destructive/10 p-4 rounded-lg flex items-start gap-3 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Not eligible to borrow</p>
                <p className="text-xs text-destructive/80">
                  {eligibility.reason}
                </p>
                {getCountdown() && (
                  <p className="text-xs font-semibold text-destructive">
                    Next eligible: {getCountdown()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={!isEligible || isLoading}
          >
            {isLoading ? "Processing..." : "Continue to Borrow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BorrowModal;
