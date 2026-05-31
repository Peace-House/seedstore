import { useEffect, useMemo, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';

import {
  useConfirmFreeCopiesUpdate,
  useRequestFreeCopiesOtp,
} from '@/hooks/useFreeCopies';
import { FreeCopyBookRow } from '@/services/adminFreeCopies';

/**
 * Three-step OTP-gated update of a book's free-copies total.
 *
 *   1. Enter new total. Validate against `freeCopiesUsed`.
 *   2. Click "Send verification code". Server pushes a 6-digit
 *      code to admin's mobile + emails it. Returns a requestId.
 *   3. Admin types code → confirm. Server applies the update
 *      and writes an audit row.
 *
 * The dialog stays open until the admin either confirms or
 * cancels; closing mid-flow discards the requestId (the server
 * will time it out after 15 minutes regardless).
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: FreeCopyBookRow | null;
}

type Step = 'enter' | 'awaiting-code' | 'confirming';

export default function UpdateFreeCopiesDialog({
  open,
  onOpenChange,
  book,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('enter');
  const [newTotal, setNewTotal] = useState<number>(0);
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const requestOtp = useRequestFreeCopiesOtp();
  const confirmUpdate = useConfirmFreeCopiesUpdate();

  // Reset on every open/book change.
  useEffect(() => {
    if (open && book) {
      setStep('enter');
      setNewTotal(book.freeCopiesTotal);
      setCode('');
      setRequestId(null);
      setExpiresAt(null);
    }
  }, [open, book]);

  // Tick once a second so the "expires in N min" label is live.
  useEffect(() => {
    if (step !== 'awaiting-code') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const minTotal = book?.freeCopiesUsed ?? 0;
  const remaining = useMemo(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  }, [expiresAt, now]);

  const handleSendCode = async () => {
    if (!book) return;
    if (newTotal < minTotal) {
      toast({
        variant: 'destructive',
        title: 'Invalid total',
        description: `Cannot be lower than already-granted copies (${minTotal}).`,
      });
      return;
    }
    try {
      const res = await requestOtp.mutateAsync({
        bookId: book.id,
        newTotal,
      });
      setRequestId(res.requestId);
      setExpiresAt(res.expiresAt);
      setStep('awaiting-code');
      toast({
        title: 'Code sent',
        description:
          'A 6-digit code has been sent to your registered mobile device and email.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not send code',
        description: e?.response?.data?.error ?? e?.message ?? 'Unknown error',
      });
    }
  };

  const handleConfirm = async () => {
    if (!book || !requestId) return;
    if (code.trim().length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'Enter the 6-digit code.',
      });
      return;
    }
    setStep('confirming');
    try {
      const res = await confirmUpdate.mutateAsync({
        bookId: book.id,
        requestId,
        code: code.trim(),
      });
      toast({
        title: 'Free copies updated',
        description: `${res.book.title} is now ${res.book.freeCopiesTotal} total (${res.book.remaining} remaining).`,
      });
      onOpenChange(false);
    } catch (e: any) {
      setStep('awaiting-code');
      toast({
        variant: 'destructive',
        title: 'Code rejected',
        description: e?.response?.data?.error ?? e?.message ?? 'Unknown error',
      });
    }
  };

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update free copies</DialogTitle>
          <DialogDescription>
            {book.title}
            <span className="block text-xs mt-0.5 text-muted-foreground">
              Currently {book.freeCopiesTotal} total · {book.freeCopiesUsed}{' '}
              used · {book.remaining} remaining
            </span>
          </DialogDescription>
        </DialogHeader>

        {step === 'enter' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-total">New total</Label>
              <Input
                id="new-total"
                type="number"
                min={minTotal}
                value={newTotal}
                onChange={(e) =>
                  setNewTotal(
                    e.target.value === ''
                      ? 0
                      : parseInt(e.target.value, 10) || 0,
                  )
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cannot be less than {minTotal} (already granted).
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={requestOtp.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendCode}
                disabled={requestOtp.isPending || newTotal < minTotal}
              >
                {requestOtp.isPending ? 'Sending…' : 'Send verification code'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {(step === 'awaiting-code' || step === 'confirming') && (
          <div className="space-y-4">
            <div className="text-sm">
              A 6-digit code was sent to your registered mobile device and
              email. It expires in{' '}
              <span className="font-medium">
                {Math.floor(remaining / 60)}m {remaining % 60}s
              </span>
              .
            </div>
            <div>
              <Label htmlFor="otp-code">Verification code</Label>
              <Input
                id="otp-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="123456"
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setStep('enter')}
                disabled={confirmUpdate.isPending || step === 'confirming'}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  confirmUpdate.isPending ||
                  step === 'confirming' ||
                  code.length !== 6
                }
              >
                {step === 'confirming' ? 'Confirming…' : 'Confirm update'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
