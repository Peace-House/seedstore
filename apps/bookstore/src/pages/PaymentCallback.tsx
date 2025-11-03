import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPaystackPayment } from '@/services/payment';
import { useToast } from '@/hooks/use-toast';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const navigate = useNavigate();
  const { toast } = useToast();

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
    verifyPaystackPayment(reference)
      .then((res) => {
        if (res.data && res.data.status === 'success') {
          toast({
            title: 'Payment Successful',
            description: 'Your order has been processed.'
          });
          navigate('/library');
        } else {
          toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: 'Verification failed. Please contact support.'
          });
          navigate('/cart');
        }
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Payment Error',
          description: 'Could not verify payment.'
        });
        navigate('/cart');
      });
  }, [reference, navigate, toast]);

  return (
    <div className="container py-16 flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Verifying Payment...</h2>
      <p className="text-muted-foreground">Please wait while we confirm your transaction.</p>
    </div>
  );
};

export default PaymentCallback;
