import { z } from 'zod';
import { useEffect, useState } from 'react';
import { getCountries, getStates } from '@/services/location';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Logo from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { acceptAdminInvite } from '@/services';
import { Button } from '@/components/ui/button';
import { detectPlatform, getDeviceId, getDeviceName, getDeviceLocation } from '@/utils/platform';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const goto = searchParams.get('redirect');
  const admin_email = searchParams.get('email')
  const token = searchParams.get('token')

  const [isLogin, setIsLogin] = useState(admin_email && token ? false : true);
  const [email, setEmail] = useState(admin_email ? admin_email : '');
  const [phcode, setPhcode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState<{ Id: string; CountryName: string }[]>([]);
  const [states, setStates] = useState<{ Id: string; StateName: string }[]>([]);
  const [countryOfResidence, setCountryOfResidence] = useState('162'); // Default Nigeria
  const [stateOfResidence, setStateOfResidence] = useState('');

  // Fetch countries and states for signup
  useEffect(() => {
    if (!isLogin) {
      getCountries().then(setCountries).catch(() => setCountries([]));
      getStates().then(setStates).catch(() => setStates([]));
    }
  }, [isLogin]);

  // Reset state if country changes
  useEffect(() => {
    if (countryOfResidence !== '162') setStateOfResidence('');
  }, [countryOfResidence]);

  const { login, register, user, loading, token: authToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect if already logged in
    if (user && authToken) {
      navigate('/#all-books');
    }
  }, [user, authToken])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Only validate confirmPassword for signup
    if (!isLogin) {
      const signupSchema = z.object({
        password: z.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string().min(6, 'Confirm Password must be at least 6 characters'),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
      });

      const validation = signupSchema.safeParse({ password, confirmPassword });
      if (!validation.success) {
        setIsSubmitting(false);
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: validation.error.errors[0].message,
        });
        return;
      }
    } else {
      // For login, just validate password length
      const loginSchema = z.object({
        password: z.string().min(6, 'Password must be at least 6 characters'),
      });

      const validation = loginSchema.safeParse({ password });
      if (!validation.success) {
        setIsSubmitting(false);
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: validation.error.errors[0].message,
        });
        return;
      }
    }

    try {
      if (isLogin) {
        // Get device info for session tracking
        const deviceName = getDeviceName();
        const location = await getDeviceLocation();
        
        await login({ email, password, platform: detectPlatform(), deviceId: getDeviceId(), deviceName, location });
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in.',
        });

        if (goto === 'cart') {
          navigate('/cart?action=checkout');
        } else {
          navigate('/#all-books');
        }

      } else {
        if (admin_email && token) {
          // Accept admin invite
          await acceptAdminInvite({ email: admin_email, firstName, lastName, password, phoneNumber, phcode, token });
          toast({
            title: 'Admin Account Created!',
            description: 'You can now log in to your admin account.',
          });
          setIsLogin(true);
          navigate('/auth');
          return;
        }
        // Regular user registration
        await register({
          email,
          firstName,
          lastName,
          phoneNumber,
          password,
          countryOfResidence,
          stateOfResidence: countryOfResidence === '162' ? stateOfResidence : undefined,
        });
        toast({
          title: 'Account Created!',
          description: 'You can now log in to your account.',
        });
        setIsLogin(true);
      }
    } catch (error: unknown) {
      console.error('Authentication error:', error);
      const errorCode = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error instanceof Error ? error.message : 'An unexpected error occurred.');
      if (errorCode === 'DEVICE_LIMIT_EXCEEDED') {
        toast({
          variant: 'destructive',
          title: 'Device Limit Reached',
          description: 'You can only be logged in on 3 devices. Please log out from another device to continue.',
        });
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4"
      style={{
        backgroundImage: 'url(/cross.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >

      <Card className="w-full max-w-md shadow-lg relative">
        <button onClick={() => navigate(-1)} className='absolute top-3 left-3'>
          <ChevronLeft className='h-5 w-5' />
        </button>
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Sign in to access your library'
              : 'Sign up to start reading'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="flex flex-col md:flex-row md:items-center md:gap-2">

                <div className="space-y-2 w-full md:w-1/2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2 w-full md:w-1/2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}
            {isLogin && <div className="space-y-2">
              <Label htmlFor="email">Email/Ph-Code</Label>
              <Input
                id="email"
                type="text"
                placeholder="Enter your email or phcode"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>}
            {!isLogin &&
            <>
              <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                <div className="space-y-1 w-full md:w-2/3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 w-full md:w-1/2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="(+234) 9012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:gap-2 mt-2">
                <div className={`space-y-1 w-full ${countryOfResidence === '162' ? 'md:w-1/2' : 'md:w-full'}`}>
                  <Label htmlFor="countryOfResidence">Country</Label>
                  <select
                    id="countryOfResidence"
                    value={countryOfResidence}
                    onChange={e => setCountryOfResidence(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    {countries.map(c => (
                      <option key={c.Id} value={c.Id}>{c.CountryName}</option>
                    ))}
                  </select>
                </div>
                {countryOfResidence === '162' && (
                  <div className="space-y-1 w-full md:w-1/2">
                    <Label htmlFor="stateOfResidence">State</Label>
                    <select
                      id="stateOfResidence"
                      value={stateOfResidence}
                      onChange={e => setStateOfResidence(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      required={countryOfResidence === '162'}
                      
                    >
                      <option value="">Select state</option>
                      {states.map(s => (
                        <option key={s.Id} value={s.Id}>{s.StateName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </>
            }
            <div className={`grid  ${isLogin ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 md:gap-2'}`}>
              <div className="relative">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
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
              {(!isLogin && admin_email && token) &&
                <div className="">
                  <Label htmlFor="phcode">PH-Code </Label>
                  <Input
                    id="phcode"
                    type="text"
                    placeholder="Enter your PH-Code"
                    value={phcode}
                    onChange={(e) => setPhcode(e.target.value)}
                    required
                  />
                </div>}
              {!isLogin &&
                <div className="relative">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>}


            </div>
            <Button variant='outline' type="submit" className="w-full !mt-8 mb-3 shadow-lg !bg-primary !text-white"
              disabled={isSubmitting || loading || (!isLogin && password !== confirmPassword)
                || (isLogin && (!email || !password))
              }>
              {(isSubmitting || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
