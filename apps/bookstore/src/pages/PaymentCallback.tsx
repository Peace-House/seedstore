import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  verifyPaystackPayment,
  verifyMtnMomoPayment,
  verifyFlutterwavePayment,
} from '@/services/payment'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PaymentCallback = () => {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference') || searchParams.get('tx_ref')
  const method = searchParams.get('method')
  const callbackStatus = searchParams.get('status')?.toLowerCase()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [status, setStatus] = useState<
    'verifying' | 'success' | 'failed' | 'pending' | 'cancelled'
  >('verifying')
  const [pollingCount, setPollingCount] = useState(0)

  useEffect(() => {
    if (method === 'flutterwave' && callbackStatus === 'cancelled') {
      setStatus('cancelled')
      toast({
        variant: 'destructive',
        title: 'Payment Cancelled',
        description: 'You cancelled the Flutterwave payment.',
      })
      return
    }

    if (!reference) {
      toast({
        variant: 'destructive',
        title: 'Payment Error',
        description: 'No payment reference found.',
      })
      navigate('/cart')
      return
    }

    const verifyPayment = async () => {
      try {
        if (method === 'mtnmomo') {
          // MTN MoMo verification with polling
          const res = await verifyMtnMomoPayment(reference)

          if (res.status === 'SUCCESSFUL') {
            setStatus('success')
            toast({
              title: 'Payment Successful',
              description: 'Your order has been processed.',
            })
            setTimeout(() => navigate('/library'), 2000)
          } else if (res.status === 'FAILED') {
            setStatus('failed')
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description: 'Your payment was not successful. Please try again.',
            })
          } else if (res.status === 'PENDING') {
            setStatus('pending')
            // Poll again if still pending (max 10 attempts)
            if (pollingCount < 10) {
              setTimeout(() => {
                setPollingCount((prev) => prev + 1)
              }, 5000) // Poll every 5 seconds
            } else {
              toast({
                variant: 'destructive',
                title: 'Payment Timeout',
                description:
                  'Payment verification timed out. Please check your MTN MoMo app.',
              })
            }
          }
        } else if (method === 'flutterwave') {
          const res = await verifyFlutterwavePayment(reference)

          if (
            res.status === 'successful' ||
            res.status === 'completed' ||
            res.status === 'succeeded'
          ) {
            setStatus('success')
            toast({
              title: 'Payment Successful',
              description: 'Your order has been processed.',
            })
            setTimeout(() => navigate('/library'), 2000)
          } else if (res.status === 'pending') {
            setStatus('pending')
            if (pollingCount < 10) {
              setTimeout(() => {
                setPollingCount((prev) => prev + 1)
              }, 5000)
            } else {
              toast({
                variant: 'destructive',
                title: 'Payment Pending',
                description:
                  'Your payment is still pending confirmation. Please wait a little longer or contact support.',
              })
            }
          } else {
            setStatus('failed')
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description:
                res.message || 'Verification failed. Please contact support.',
            })
          }
        } else {
          // Paystack verification
          const res = await verifyPaystackPayment(reference)
          if (res.status === 'success') {
            setStatus('success')
            toast({
              title: 'Payment Successful',
              description: 'Your order has been processed.',
            })
            setTimeout(() => navigate('/library'), 2000)
          } else if (res.status === 'error') {
            setStatus('failed')
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description:
                res.message || 'Verification failed. Please contact support.',
            })
          } else {
            setStatus('failed')
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description: 'Verification failed. Please contact support.',
            })
          }
        }
      } catch (error) {
        setStatus('failed')
        toast({
          variant: 'destructive',
          title: 'Payment Error',
          description: 'Could not verify payment.',
        })
      }
    }

    verifyPayment()
  }, [reference, method, callbackStatus, navigate, toast, pollingCount])

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16">
      {status === 'verifying' && (
        <>
          <Loader2 className="text-primary mb-4 h-16 w-16 animate-spin" />
          <h2 className="mb-2 text-2xl font-bold">Verifying Payment...</h2>
          <p className="text-muted-foreground">
            Please wait while we confirm your transaction.
          </p>
          <p className="mt-4 max-w-md text-center text-sm text-yellow-600">
            🔔 Do not close this page or navigate away until verification is
            complete.
          </p>
        </>
      )}

      {status === 'pending' && (
        <>
          <Loader2 className="mb-4 h-16 w-16 animate-spin text-yellow-500" />
          <h2 className="mb-2 text-2xl font-bold">Awaiting Payment Approval</h2>
          <p className="text-muted-foreground mb-4">
            {method === 'mtnmomo'
              ? 'Please check your MTN MoMo app and approve the payment request.'
              : 'Your payment is being confirmed. Please wait while we keep checking the status.'}
          </p>
          <p className="text-muted-foreground text-sm">
            Checking status... ({pollingCount + 1}/10)
          </p>
          <p className="mt-4 max-w-md text-center text-sm text-yellow-600">
            🔔 Do not close this page or navigate away until the process
            completes.
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold">Payment Successful!</h2>
          <p className="text-muted-foreground mb-4">
            Your order has been processed successfully.
          </p>
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="text-primary h-5 w-5 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Setting up your library...
            </p>
          </div>
          <p className="mt-4 max-w-md text-center text-sm font-medium text-yellow-600">
            🔔 Please wait while we complete the setup. Do not close or refresh
            this page.
          </p>
        </>
      )}

      {status === 'failed' && (
        <>
          <XCircle className="mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold">Payment Failed</h2>
          <p className="text-muted-foreground mb-4">
            We couldn't verify your payment. Please try again or contact
            support.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => navigate('/cart')}>Back to Cart</Button>
            <Button variant="outline" onClick={() => navigate('/checkout')}>
              Try Again
            </Button>
          </div>
        </>
      )}

      {status === 'cancelled' && (
        <>
          <XCircle className="mb-4 h-16 w-16 text-orange-500" />
          <h2 className="mb-2 text-2xl font-bold">Payment Cancelled</h2>
          <p className="text-muted-foreground mb-4">
            Your Flutterwave payment was cancelled. No charge was completed.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => navigate('/checkout')}>
              Back to Checkout
            </Button>
            <Button variant="outline" onClick={() => navigate('/cart')}>
              Back to Cart
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default PaymentCallback
