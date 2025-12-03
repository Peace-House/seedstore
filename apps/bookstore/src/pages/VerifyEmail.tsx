import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyEmail, resendVerificationEmail } from '@/services/user';
import { useToast } from '@/hooks/use-toast';

type VerificationStatus = 'loading' | 'success' | 'already-verified' | 'error' | 'expired';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        const response = await verifyEmail(token);
        
        if (response.alreadyVerified) {
          setStatus('already-verified');
        } else {
          setStatus('success');
        }
      } catch (err: unknown) {
        console.error('Verification error:', err);
        
        const error = err as { response?: { data?: { message?: string } } };
        const message = error.response?.data?.message || 'Verification failed';
        setErrorMessage(message);
        
        if (message.includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
      }
    };

    verify();
  }, [token]);

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Email address not found. Please sign up again.',
      });
      return;
    }

    setResending(true);
    try {
      await resendVerificationEmail(email);
      toast({
        title: 'Email Sent',
        description: 'A new verification email has been sent. Please check your inbox.',
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to resend verification email',
      });
    } finally {
      setResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">Verifying Your Email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600">Email Verified!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. You can now access all features of your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Browse Books
              </Button>
            </CardContent>
          </>
        );

      case 'already-verified':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle2 className="h-16 w-16 text-blue-500" />
              </div>
              <CardTitle className="text-2xl text-blue-600">Already Verified</CardTitle>
              <CardDescription>
                Your email address has already been verified. You can log in to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </>
        );

      case 'expired':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Mail className="h-16 w-16 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl text-yellow-600">Link Expired</CardTitle>
              <CardDescription>
                Your verification link has expired. Click below to receive a new verification email.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button 
                onClick={handleResendVerification} 
                disabled={resending}
                className="w-full"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                Back to Login
              </Button>
            </CardContent>
          </>
        );

      case 'error':
      default:
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-red-600">Verification Failed</CardTitle>
              <CardDescription>
                {errorMessage || 'We couldn\'t verify your email address. The link may be invalid or expired.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {email && (
                <Button 
                  onClick={handleResendVerification} 
                  disabled={resending}
                  className="w-full"
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                Back to Login
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Need help?{' '}
                <Link to="/contact" className="text-primary hover:underline">
                  Contact Support
                </Link>
              </p>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="mb-8">
        <Logo />
      </div>
      
      <Card className="w-full max-w-md">
        {renderContent()}
      </Card>
    </div>
  );
};

export default VerifyEmail;
