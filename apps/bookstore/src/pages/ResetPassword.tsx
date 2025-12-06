import { useState, useRef, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Eye, EyeOff, Mail, Lock, CheckCircle2, User } from 'lucide-react';

import Logo from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateOTP, validateOTP, resetPasswordLegacy, syncPasswordToLocal } from '@/services/legacyAuth';

type Step = 'identity' | 'otp' | 'password' | 'success';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 15 * 60; // 15 minutes in seconds

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Current step in the flow
  const [step, setStep] = useState<Step>('identity');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Identity verification
  const [phcode, setPhcode] = useState('');
  const [email, setEmail] = useState('');

  // Step 2: OTP verification
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [verificationToken, setVerificationToken] = useState('');
  const [otpTimeLeft, setOtpTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Step 3: New password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start/reset the OTP countdown timer
  const startOtpTimer = useCallback(() => {
    setOtpTimeLeft(OTP_EXPIRY_SECONDS);
    setCanResendOtp(false);
  }, []);

  // OTP countdown timer effect
  useEffect(() => {
    if (step !== 'otp') return;

    const timer = setInterval(() => {
      setOtpTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResendOtp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = digit;
    setOtpDigits(newOtpDigits);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    
    if (pastedData) {
      const newOtpDigits = [...otpDigits];
      for (let i = 0; i < pastedData.length; i++) {
        newOtpDigits[i] = pastedData[i];
      }
      setOtpDigits(newOtpDigits);
      
      // Focus the next empty input or the last one
      const nextEmptyIndex = newOtpDigits.findIndex((d) => !d);
      const focusIndex = nextEmptyIndex === -1 ? OTP_LENGTH - 1 : nextEmptyIndex;
      otpInputRefs.current[focusIndex]?.focus();
    }
  };

  const getOtpValue = () => otpDigits.join('');

  // Step 1: Request OTP
  const handleGenerateOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate inputs
    const schema = z.object({
      phcode: z.string().min(1, 'PHCode is required'),
      email: z.string().email('Please enter a valid email'),
    });

    const validation = schema.safeParse({ phcode, email });
    if (!validation.success) {
      setIsSubmitting(false);
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: validation.error.errors[0].message,
      });
      return;
    }

    try {
      const response = await generateOTP(phcode, email);
      if (response.status) {
        toast({
          title: 'OTP Sent!',
          description: 'Please check your email for the verification code.',
        });
        setOtpDigits(Array(OTP_LENGTH).fill('')); // Reset OTP
        startOtpTimer(); // Start countdown
        setStep('otp');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'Failed to send OTP. Please check your details.',
        });
      }
    } catch (error: unknown) {
      console.error('Generate OTP error:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Failed to send OTP. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleValidateOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const otp = getOtpValue();

    // Validate OTP
    const schema = z.object({
      otp: z.string().length(OTP_LENGTH, `Please enter the ${OTP_LENGTH}-digit OTP`),
    });

    const validation = schema.safeParse({ otp });
    if (!validation.success) {
      setIsSubmitting(false);
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: validation.error.errors[0].message,
      });
      return;
    }

    try {
      const response = await validateOTP(phcode, otp);
      if (response.status && response.verificationToken) {
        setVerificationToken(response.verificationToken);
        toast({
          title: 'OTP Verified!',
          description: 'You can now set your new password.',
        });
        setStep('password');
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid OTP',
          description: response.message || 'The OTP you entered is incorrect or has expired.',
        });
      }
    } catch (error: unknown) {
      console.error('Validate OTP error:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate password
    const schema = z
      .object({
        password: z.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string().min(6, 'Confirm password is required'),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
      });

    const validation = schema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setIsSubmitting(false);
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: validation.error.errors[0].message,
      });
      return;
    }

    try {
      const response = await resetPasswordLegacy(phcode, password, verificationToken);
      if (response.status) {
        // Sync password to local database as well
        try {
          await syncPasswordToLocal(phcode, password);
        } catch (syncError) {
          // Don't fail the whole flow if local sync fails - legacy reset was successful
          console.warn('Local password sync failed (non-critical):', syncError);
        }
        
        toast({
          title: 'Password Reset Successful!',
          description: 'You can now log in with your new password.',
        });
        setStep('success');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'Failed to reset password. Please try again.',
        });
      }
    } catch (error: unknown) {
      console.error('Reset password error:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Failed to reset password. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setIsSubmitting(true);
    try {
      const response = await generateOTP(phcode, email);
      if (response.status) {
        toast({
          title: 'OTP Resent!',
          description: 'Please check your email for the new verification code.',
        });
        setOtpDigits(Array(OTP_LENGTH).fill('')); // Reset OTP inputs
        startOtpTimer(); // Restart countdown
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'Failed to resend OTP.',
        });
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to resend OTP. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'identity' ? 'bg-primary text-white' : 'bg-primary/20 text-primary'
          }`}
        >
          1
        </div>
        <div className={`w-8 h-0.5 ${step !== 'identity' ? 'bg-primary' : 'bg-gray-300'}`} />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'otp' ? 'bg-primary text-white' : step === 'password' || step === 'success' ? 'bg-primary/20 text-primary' : 'bg-gray-300 text-gray-500'
          }`}
        >
          2
        </div>
        <div className={`w-8 h-0.5 ${step === 'password' || step === 'success' ? 'bg-primary' : 'bg-gray-300'}`} />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'password' ? 'bg-primary text-white' : step === 'success' ? 'bg-primary/20 text-primary' : 'bg-gray-300 text-gray-500'
          }`}
        >
          3
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4"
      style={{
        backgroundImage: 'url(/bg-cross-new.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Card className="w-full max-w-md shadow-lg border-[0.5px] border-primary relative">
        <button onClick={() => navigate('/auth')} className="absolute top-3 left-3">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            {step === 'identity' && 'Enter your PHCode and email to get started'}
            {step === 'otp' && 'Enter the verification code sent to your email'}
            {step === 'password' && 'Create a new secure password'}
            {step === 'success' && 'Your password has been reset successfully'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <StepIndicator />

          {/* Step 1: Identity Verification */}
          {step === 'identity' && (
            <form onSubmit={handleGenerateOTP} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="phcode">PHCode</Label>
                <div className="relative">
                  <User className="absolute left-3 z-10 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phcode"
                    type="text"
                    placeholder="Enter your PHCode"
                    value={phcode}
                    onChange={(e) => setPhcode(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute z-10 left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email linked to your account"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <br />

              <Button
                type="submit"
                className="w-full mt-6"
                liquidGlass={false}
                disabled={isSubmitting || !phcode || !email}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Verification Code
              </Button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <form onSubmit={handleValidateOTP} className="space-y-4">
              <div className="space-y-4">
                <Label className="text-center block">Enter Verification Code</Label>
                <div className="flex justify-center gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-14 text-center text-xl font-semibold border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-background"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 text-center">
                  We sent a 6-digit code to <span className="font-medium">{email}</span>
                </p>
                <div className="text-center">
                  {otpTimeLeft > 0 ? (
                    <p className={`text-sm font-medium ${otpTimeLeft <= 60 ? 'text-red-500' : 'text-gray-600'}`}>
                      Code expires in <span className="font-mono">{formatTime(otpTimeLeft)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-red-500 font-medium">
                      Code has expired. Please request a new one.
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isSubmitting || getOtpValue().length !== OTP_LENGTH || otpTimeLeft === 0}
                liquidGlass={false}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Code
              </Button>

              <div className="text-center mt-4">
                {canResendOtp ? (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isSubmitting}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Resend Code
                  </button>
                ) : (
                  <p className="text-sm text-gray-400">
                    Resend code available in <span className="font-mono">{formatTime(otpTimeLeft)}</span>
                  </p>
                )}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('identity')}
                  className="text-gray-500 hover:underline text-sm"
                >
                  ← Back to previous step
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Set New Password */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute z-10 left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute z-10 left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}

              <Button
                type="submit"
                className="w-full mt-6"
                liquidGlass={false}
                disabled={isSubmitting || !password || !confirmPassword || password !== confirmPassword}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </form>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-gray-600">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full mt-6"
                liquidGlass={false}
              >
                Go to Login
              </Button>
            </div>
          )}

          {step !== 'success' && (
            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline"
              >
                I remember my password? Sign in
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
