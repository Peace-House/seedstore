import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPaystackPayment, verifyMtnMomoPayment } from '@/services/payment';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const method = searchParams.get('method');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'pending'>('verifying');
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (!reference) {
      toast({
        variant: 'destructive',
        title: 'Payment Error',
        description: 'No payment reference found.'
      });
      navigate('/cart');
      return;
    }

    const verifyPayment = async () => {
      try {
        if (method === 'mtnmomo') {
          // MTN MoMo verification with polling
          const res = await verifyMtnMomoPayment(reference);
          
          if (res.status === 'SUCCESSFUL') {
            setStatus('success');
            toast({
              title: 'Payment Successful',
              description: 'Your order has been processed.'
            });
            setTimeout(() => navigate('/library'), 2000);
          } else if (res.status === 'FAILED') {
            setStatus('failed');
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description: 'Your payment was not successful. Please try again.'
            });
          } else if (res.status === 'PENDING') {
            setStatus('pending');
            // Poll again if still pending (max 10 attempts)
            if (pollingCount < 10) {
              setTimeout(() => {
                setPollingCount(prev => prev + 1);
              }, 5000); // Poll every 5 seconds
            } else {
              toast({
                variant: 'destructive',
                title: 'Payment Timeout',
                description: 'Payment verification timed out. Please check your MTN MoMo app.'
              });
            }
          }
        } else {
          // Paystack verification
          const res = await verifyPaystackPayment(reference);
          if (res.status === 'success') {
            setStatus('success');
            toast({
              title: 'Payment Successful',
              description: 'Your order has been processed.'
            });
            setTimeout(() => navigate('/library'), 2000);
          } else if (res.status === 'error') {
            setStatus('failed');
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description: res.message || 'Verification failed. Please contact support.'
            });
          } else {
            setStatus('failed');
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description: 'Verification failed. Please contact support.'
            });
          }
        }
      } catch (error) {
        setStatus('failed');
        toast({
          variant: 'destructive',
          title: 'Payment Error',
          description: 'Could not verify payment.'
        });
      }
    };

    verifyPayment();
  }, [reference, method, navigate, toast, pollingCount]);

  return (
    <div className="container py-16 flex flex-col items-center justify-center min-h-[60vh]">
      {status === 'verifying' && (
        <>
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
          <p className="text-muted-foreground">Please wait while we confirm your transaction.</p>
        </>
      )}

      {status === 'pending' && (
        <>
          <Loader2 className="h-16 w-16 animate-spin text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Awaiting Payment Approval</h2>
          <p className="text-muted-foreground mb-4">
            Please check your MTN MoMo app and approve the payment request.
          </p>
          <p className="text-sm text-muted-foreground">
            Checking status... ({pollingCount + 1}/10)
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-4">Your order has been processed successfully.</p>
          <p className="text-sm text-muted-foreground">Redirecting to your library...</p>
        </>
      )}

      {status === 'failed' && (
        <>
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
          <p className="text-muted-foreground mb-4">
            We couldn't verify your payment. Please try again or contact support.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => navigate('/cart')}>Back to Cart</Button>
            <Button variant="outline" onClick={() => navigate('/checkout')}>Try Again</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentCallback;
