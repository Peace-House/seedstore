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
import { freeCopyErr } from '@/services/adminFreeCopies';

/**
 * Three-step OTP-gated increase of an allocation's free-copy total.
 *   1. Enter new total (>= already-given).
 *   2. Server pushes a 6-digit code to the admin's mobile + email.
 *   3. Admin types the code → confirm → server applies + writes an audit row.
 */
export interface AllocationTarget {
  allocationId: string;
  holderPhcode: string;
  holderName: string | null;
  total: number;
  used: number;
  remaining: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: AllocationTarget | null;
  bookTitle?: string;
}

type Step = 'enter' | 'awaiting-code' | 'confirming';

export default function UpdateFreeCopiesDialog({
  open,
  onOpenChange,
  allocation,
  bookTitle,
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

  useEffect(() => {
    if (open && allocation) {
      setStep('enter');
      setNewTotal(allocation.total + 1);
      setCode('');
      setRequestId(null);
      setExpiresAt(null);
    }
  }, [open, allocation]);

  useEffect(() => {
    if (step !== 'awaiting-code') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  // Increase-only: the new total must exceed the current total.
  const minTotal = (allocation?.total ?? 0) + 1;
  const remaining = useMemo(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  }, [expiresAt, now]);

  const holderLabel = allocation
    ? allocation.holderName || allocation.holderPhcode
    : '';

  const handleSendCode = async () => {
    if (!allocation) return;
    if (newTotal < minTotal) {
      toast({
        variant: 'destructive',
        title: 'Invalid total',
        description: `Must be greater than the current total (${allocation.total}).`,
      });
      return;
    }
    try {
      const res = await requestOtp.mutateAsync({
        allocationId: allocation.allocationId,
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
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not send code',
        description: freeCopyErr(e),
      });
    }
  };

  const handleConfirm = async () => {
    if (!allocation || !requestId) return;
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
        allocationId: allocation.allocationId,
        requestId,
        code: code.trim(),
      });
      toast({
        title: 'Free copies updated',
        description: `${holderLabel} now has ${res.allocation.total} total (${res.allocation.remaining} remaining).`,
      });
      onOpenChange(false);
    } catch (e) {
      setStep('awaiting-code');
      toast({
        variant: 'destructive',
        title: 'Code rejected',
        description: freeCopyErr(e),
      });
    }
  };

  if (!allocation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Increase free copies</DialogTitle>
          <DialogDescription>
            {bookTitle ? `${bookTitle} · ` : ''}
            {holderLabel}
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Currently {allocation.total} total · {allocation.used} given ·{' '}
              {allocation.remaining} remaining
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
              <p className="mt-1 text-xs text-muted-foreground">
                Must be greater than the current total ({allocation.total}).
                {allocation.used} already given.
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
                className="text-center font-mono text-lg tracking-widest"
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
