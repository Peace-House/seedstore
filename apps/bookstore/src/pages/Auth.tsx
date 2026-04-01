import { z } from 'zod'
import { useEffect, useState } from 'react'
import { getCountries, getStates } from '@/services/location'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, Loader2, Eye, EyeOff, User, Lock } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Logo from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { acceptAdminInvite } from '@/services'
import { Button } from '@/components/ui/button'

import {
  detectPlatform,
  getDeviceId,
  getDeviceName,
  getDeviceLocation,
} from '@/utils/platform'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

const Auth = () => {
  const [searchParams] = useSearchParams()
  const goto = searchParams.get('redirect')
  const admin_email = searchParams.get('email')
  const token = searchParams.get('token')

  const [isLogin, setIsLogin] = useState(admin_email && token ? false : true)
  const [showPHCodeInfo, setShowPHCodeInfo] = useState(false)
  const [email, setEmail] = useState(admin_email ? admin_email : '')
  const [phcode, setPhcode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countries, setCountries] = useState<
    { Id: string; CountryName: string }[]
  >([])
  const [states, setStates] = useState<{ Id: string; StateName: string }[]>([])
  const [countryOfResidence, setCountryOfResidence] = useState('162') // Default Nigeria
  const [stateOfResidence, setStateOfResidence] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [showSignUpSuccessfulModal, setShowSignUpSuccessfulModal] =
    useState(false)
  const [PhCode, setPhCode] = useState('')

  // Fetch countries and states for signup
  useEffect(() => {
    if (!isLogin) {
      getCountries()
        .then(setCountries)
        .catch(() => setCountries([]))
      getStates()
        .then(setStates)
        .catch(() => setStates([]))
    }
  }, [isLogin])

  // Reset state if country changes
  useEffect(() => {
    if (countryOfResidence !== '162') setStateOfResidence('')
  }, [countryOfResidence])

  const { login, register, user, loading, token: authToken } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    // Redirect if already logged in
    if (user && authToken) {
      navigate('/#all-books')
    }
  }, [user, authToken])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Only validate confirmPassword for signup
    if (!isLogin) {
      const signupSchema = z
        .object({
          password: z.string().min(6),
          confirmPassword: z.string().min(6),
          gender: z.enum(['male', 'female']),
          dateOfBirth: z.string().min(1, 'Date of birth is required'),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
          path: ['confirmPassword'],
        })

      const validation = signupSchema.safeParse({
        password,
        confirmPassword,
        gender,
        dateOfBirth,
      })
      if (!validation.success) {
        setIsSubmitting(false)
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: validation.error.errors[0].message,
        })
        return
      }
    } else {
      // For login, just validate password length
      const loginSchema = z.object({
        password: z.string().min(6, 'Password must be at least 6 characters'),
      })

      const validation = loginSchema.safeParse({ password })
      if (!validation.success) {
        setIsSubmitting(false)
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: validation.error.errors[0].message,
        })
        return
      }
    }

    try {
      if (isLogin) {
        // Get device info for session tracking
        const deviceName = getDeviceName()
        const location = await getDeviceLocation()

        await login({
          phcode,
          password,
          platform: detectPlatform(),
          deviceId: getDeviceId(),
          deviceName,
          location,
        })
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in.',
        })

        if (goto === 'cart') {
          navigate('/cart?action=checkout')
        } else {
          navigate('/#all-books')
        }
      } else {
        if (admin_email && token) {
          // Accept admin invite
          await acceptAdminInvite({
            email: admin_email,
            firstName,
            lastName,
            password,
            phoneNumber,
            phcode,
            token,
          })
          toast({
            title: 'Admin Account Created!',
            description: 'You can now log in to your admin account.',
          })
          setShowSignUpSuccessfulModal(true)
          // setIsLogin(true);
          navigate('/auth')
          return
        }
        // Regular user registration
        const res: any = await register({
          email,
          firstName,
          lastName,
          phoneNumber,
          password,
          countryOfResidence,
          stateOfResidence:
            countryOfResidence === '162' ? stateOfResidence : undefined,
          gender,
          dateOfBirth,
        })
        toast({
          title: 'Account Created!',
          description: 'You can now log in to your account.',
        })
        setIsLogin(true)
        const legacy_phcode = res?.PHCode
        setPhCode(legacy_phcode)
      }
    } catch (error: unknown) {
      console.error('Authentication error:', error)
      const errorCode = (error as { response?: { data?: { code?: string } } })
        ?.response?.data?.code
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (error instanceof Error
          ? error.message
          : 'An unexpected error occurred.')
      if (errorCode === 'DEVICE_LIMIT_EXCEEDED') {
        toast({
          variant: 'destructive',
          title: 'Device Limit Reached',
          description:
            'You can only be logged in on 3 devices. Please log out from another device to continue.',
        })
        return
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="from-primary/10 via-background to-accent/10 flex min-h-screen items-center justify-center bg-gradient-to-br p-4"
      style={{
        backgroundImage: 'url(/bg-cross-new.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Card className="border-primary relative w-full max-w-lg border-[0.5px] shadow-lg">
        <button
          onClick={() =>
            !isLogin && !showSignUpSuccessfulModal
              ? setIsLogin(true)
              : navigate('/')
          }
          className="absolute top-3 left-3"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <CardHeader className="space-y-1 text-center">
          <div className="mb-2 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">
            {showSignUpSuccessfulModal
              ? 'Welcome!'
              : isLogin
              ? 'Sign In'
              : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Sign in to access your library'
              : showSignUpSuccessfulModal
              ? 'You can now log in to your account.'
              : 'Sign up to start reading'}
          </CardDescription>
          <CardDescription className="rounded-md bg-red-50 px-2 py-3  text-sm text-red-600 md:px-12">
            {isLogin
              ? 'Your PHCode & Password On registration.livingseed.org will also work here.'
              : 'Your account will also work on registration.livingseed.org'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {showSignUpSuccessfulModal && (
              <>
                <div>
                  <div className="mb-2 flex justify-center text-lg font-bold">
                    {'Your Account Has Been Created Successfully!'}
                  </div>
                  <br />
                  <div>
                    <strong>{'Please note the following:'}</strong>

                    <ul className="grid list-disc gap-2 pl-5">
                      <li>
                        You have been assigned the PHCode:{' '}
                        <b className="text-red-600 ">{PhCode}</b> Please Copy
                        and Keep it in a Safe Place
                      </li>
                      <li>
                        You will be required to login with this PHCode and
                        password subsequently
                      </li>
                      <li>
                        This PHCode will also log you in on all PeaceHouse
                        platform
                      </li>
                      <li>
                        Important verififcation message has been sent to the
                        email you provided
                      </li>
                    </ul>
                  </div>
                </div>
                <br />
                <div className="space-y-1">
                  <Button
                    className="w-full rounded-full"
                    variant="default"
                    onClick={() => {
                      setShowSignUpSuccessfulModal(false)
                      setIsLogin(true)
                    }}
                  >
                    Go to Login
                  </Button>
                </div>
              </>
            )}
            {!isLogin && !showSignUpSuccessfulModal && (
              <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                <div className="w-full space-y-1 md:w-1/2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter firstname"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="w-full space-y-1 md:w-1/2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter lastname"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}
            {isLogin && !showSignUpSuccessfulModal && (
              <div className="space-y-1">
                <Label htmlFor="phcode">PHCode</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPHCodeInfo(true)}
                    className="mt-1 self-end text-xs text-red-600 underline-offset-2 hover:underline focus:outline-none"
                  >
                    What is PH-Code?
                  </button>
                </div>
              </div>
            )}

            {/* PH-Code info dialog */}
            <Dialog open={showPHCodeInfo} onOpenChange={setShowPHCodeInfo}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>What is a PH-Code?</DialogTitle>
                  <DialogDescription asChild>
                    <div className="text-muted-foreground space-y-3 text-sm">
                      <p>
                        Your PH-Code is your unique Peace House identifier used
                        across Living Seed events and registrations. It looks
                        like a short code such as{' '}
                        <span className="text-foreground font-mono font-medium">
                          EBE20-M250482
                        </span>
                        .
                      </p>
                      <p>
                        If you have ever registered for a Peace House program,
                        the PH-Code was sent to your email and may also appear
                        on your registration slip or SMS.
                      </p>
                      <p>
                        If you already have a PH-Code, you can use it to log in
                        here.
                      </p>
                      <p>
                        If you don&apos;t have a PH-Code, click{' '}
                        <strong>Register Now</strong> below to create one.
                      </p>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-row gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">
                      Close
                    </Button>
                  </DialogClose>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowPHCodeInfo(false)
                      setIsLogin(false)
                    }}
                  >
                    Register Now
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {!isLogin && !showSignUpSuccessfulModal && (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                  <div className="w-full space-y-1 md:w-2/3">
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
                  <div className="w-full space-y-1 md:w-1/2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+2349000000000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-col md:flex-row md:items-center md:gap-2">
                  <div
                    className={`w-full space-y-1 ${
                      countryOfResidence === '162' ? 'md:w-1/2' : 'md:w-full'
                    }`}
                  >
                    <Label htmlFor="countryOfResidence">Country</Label>
                    <select
                      id="countryOfResidence"
                      value={countryOfResidence}
                      onChange={(e) => setCountryOfResidence(e.target.value)}
                      className="w-full rounded border px-3 py-2 text-sm"
                      required
                    >
                      {countries.map((c) => (
                        <option key={c.Id} value={c.Id}>
                          {c.CountryName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {countryOfResidence === '162' && (
                    <div className="w-full space-y-1 md:w-1/2">
                      <Label htmlFor="stateOfResidence">State</Label>
                      <select
                        id="stateOfResidence"
                        value={stateOfResidence}
                        onChange={(e) => setStateOfResidence(e.target.value)}
                        className="w-full rounded border px-3 py-2 text-sm"
                        required={countryOfResidence === '162'}
                      >
                        <option value="">Select state</option>
                        {states.map((s) => (
                          <option key={s.Id} value={s.Id}>
                            {s.StateName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {!isLogin && (
                  <div className="flex flex-col md:flex-row md:gap-2">
                    <div className="w-full space-y-1 md:w-1/2">
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded border px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>

                    <div className="w-full space-y-1 md:w-1/2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            {!showSignUpSuccessfulModal && (
              <div
                className={`grid  ${
                  isLogin
                    ? 'grid-cols-1'
                    : 'grid-cols-1 md:grid-cols-2 md:gap-2'
                }`}
              >
                <div className="relative">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10 pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {!isLogin && admin_email && token && (
                  // <div className="">
                  //   <Label htmlFor="phcode">PH-Code </Label>
                  //   <div className="relative">
                  //     <User className="absolute left-3 z-10 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  //     <Input
                  //       id="phcode"
                  //       type="text"
                  //       placeholder="Enter your PH-Code"
                  //       value={phcode}
                  //       onChange={(e) => setPhcode(e.target.value)}
                  //       required
                  //       className='pl-10'
                  //     />
                  //   </div>
                  // </div>
                  <div className="space-y-1">
                    <Label htmlFor="phcode">PHCode</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                )}
                {!isLogin && (
                  <div className="relative">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!showSignUpSuccessfulModal && (
              <Button
                variant="outline"
                type="submit"
                className="!bg-primary !mt-8 mb-3 w-full rounded-full !text-white shadow-lg"
                disabled={
                  isSubmitting ||
                  loading ||
                  (!isLogin && password !== confirmPassword) ||
                  (isLogin && (!phcode || !password))
                }
              >
                {(isSubmitting || loading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Button>
            )}
          </form>
          {!showSignUpSuccessfulModal && (
            <div className="mt-4 space-y-2 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary block w-full hover:underline"
              >
                {isLogin
                  ? "I don't have an account? Sign up"
                  : 'I have an account? Sign in'}
              </button>
              {isLogin && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/reset-password')}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    I forgot my password?
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/retrieve-phcode')}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    I forgot my PHCode? Retrieve
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Auth

// import { useEffect } from 'react'
// import { useMachine } from '@xstate/react'
// import { useNavigate, useSearchParams } from 'react-router-dom'
// import { Loader2, Eye, EyeOff, User } from 'lucide-react'

// import { authMachine } from '@/components/authMachine'
// import { useAuth } from '@/hooks/useAuth'
// import { useToast } from '@/hooks/use-toast'

// import Logo from '@/components/Logo'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import { Button } from '@/components/ui/button'
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from '@/components/ui/card'

// import {
//   detectPlatform,
//   getDeviceId,
//   getDeviceName,
//   getDeviceLocation,
// } from '@/utils/platform'

// const Auth = () => {
//   const navigate = useNavigate()
//   const { toast } = useToast()
//   const { login, register, user, token } = useAuth()
//   const [searchParams] = useSearchParams()

//   const goto = searchParams.get('redirect')

//   const [state, send] = useMachine(authMachine, {
//     services: {
//       loginUser: async (context) => {
//         const deviceName = getDeviceName()
//         const location = await getDeviceLocation()

//         const res = await login({
//           phcode: context.phcode,
//           password: context.password,
//           platform: detectPlatform(),
//           deviceId: getDeviceId(),
//           deviceName,
//           location,
//         })

//         return res
//       },

//       registerUser: async (context) => {
//         const res: any = await register({
//           email: context.email,
//           firstName: context.firstName,
//           lastName: context.lastName,
//           phoneNumber: context.phoneNumber,
//           password: context.password,
//           countryOfResidence: context.countryOfResidence,
//           stateOfResidence: context.stateOfResidence,
//           gender: context.gender,
//           dateOfBirth: context.dateOfBirth,
//         })

//         return res
//       },
//     },
//   })

//   // Derived states
//   const isLogin = state.matches('login')
//   const isSignup = state.matches('signup')
//   const isLoading =
//     state.matches('loggingIn') || state.matches('registering')
//   const isSuccessSignup = state.matches('successSignup')

//   // Redirect after login
//   useEffect(() => {
//     if (user && token) {
//       if (goto === 'cart') {
//         navigate('/cart?action=checkout')
//       } else {
//         navigate('/#all-books')
//       }
//     }
//   }, [user, token])

//   // Error toast
//   useEffect(() => {
//     if (state.context.error) {
//       toast({
//         variant: 'destructive',
//         title: 'Error',
//         description: state.context.error,
//       })
//     }
//   }, [state.context.error])

//   return (
//     <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br">
//       <Card className="w-full max-w-lg shadow-lg">
//         <CardHeader className="text-center">
//           <Logo />
//           <CardTitle className="text-2xl font-bold">
//             {isSuccessSignup
//               ? 'Welcome!'
//               : isLogin
//                 ? 'Welcome Back'
//                 : 'Create Account'}
//           </CardTitle>
//           <CardDescription>
//             {isLogin
//               ? 'Sign in to access your library'
//               : isSuccessSignup
//                 ? 'Account created successfully'
//                 : 'Sign up to start reading'}
//           </CardDescription>
//         </CardHeader>

//         <CardContent>
//           {/* SUCCESS SCREEN */}
//           {isSuccessSignup && (
//             <div className="space-y-4 text-center">
//               <p>Your PHCode:</p>
//               <b className="text-red-600 text-lg">
//                 {state.context.phCodeFromSignup}
//               </b>

//               <Button
//                 className="w-full"
//                 onClick={() => send({ type: 'SWITCH_TO_LOGIN' })}
//               >
//                 Go to Login
//               </Button>
//             </div>
//           )}

//           {/* FORM */}
//           {!isSuccessSignup && (
//             <form
//               onSubmit={(e) => {
//                 e.preventDefault()
//                 send({ type: 'SUBMIT' })
//               }}
//               className="space-y-4"
//             >
//               {/* LOGIN */}
//               {isLogin && (
//                 <>
//                   <div>
//                     <Label>PHCode</Label>
//                     <div className="relative">
//                       <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
//                       <Input
//                         className="pl-10"
//                         value={state.context.phcode}
//                         onChange={(e) =>
//                           send({
//                             type: 'UPDATE_FIELD',
//                             field: 'phcode',
//                             value: e.target.value,
//                           })
//                         }
//                       />
//                     </div>
//                   </div>

//                   <div>
//                     <Label>Password</Label>
//                     <Input
//                       type="password"
//                       value={state.context.password}
//                       onChange={(e) =>
//                         send({
//                           type: 'UPDATE_FIELD',
//                           field: 'password',
//                           value: e.target.value,
//                         })
//                       }
//                     />
//                   </div>
//                 </>
//               )}

//               {/* SIGNUP */}
//               {isSignup && (
//                 <>
//                   <Input
//                     placeholder="First Name"
//                     value={state.context.firstName}
//                     onChange={(e) =>
//                       send({
//                         type: 'UPDATE_FIELD',
//                         field: 'firstName',
//                         value: e.target.value,
//                       })
//                     }
//                   />

//                   <Input
//                     placeholder="Last Name"
//                     value={state.context.lastName}
//                     onChange={(e) =>
//                       send({
//                         type: 'UPDATE_FIELD',
//                         field: 'lastName',
//                         value: e.target.value,
//                       })
//                     }
//                   />

//                   <Input
//                     placeholder="Email"
//                     value={state.context.email}
//                     onChange={(e) =>
//                       send({
//                         type: 'UPDATE_FIELD',
//                         field: 'email',
//                         value: e.target.value,
//                       })
//                     }
//                   />

//                   <Input
//                     placeholder="Phone"
//                     value={state.context.phoneNumber}
//                     onChange={(e) =>
//                       send({
//                         type: 'UPDATE_FIELD',
//                         field: 'phoneNumber',
//                         value: e.target.value,
//                       })
//                     }
//                   />

//                   <Input
//                     type="date"
//                     value={state.context.dateOfBirth}
//                     onChange={(e) =>
//                       send({
//                         type: 'UPDATE_FIELD',
//                         field: 'dateOfBirth',
//                         value: e.target.value,
//                       })
//                     }
//                   />

//                   <Input
//                     placeholder="Password"
//                     type="password"
//                     value={state.context.password}
//                     onChange={(e) =>
//                       send({
//                         type: 'UPDATE_FIELD',
//                         field: 'password',
//                         value: e.target.value,
//                       })
//                     }
//                   />
//                 </>
//               )}

//               <Button className="w-full" disabled={isLoading}>
//                 {isLoading && (
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 )}
//                 {isLogin ? 'Sign In' : 'Sign Up'}
//               </Button>
//             </form>
//           )}

//           {/* SWITCH LINKS */}
//           {!isSuccessSignup && (
//             <div className="text-center mt-4">
//               {isLogin ? (
//                 <button
//                   onClick={() => send({ type: 'SWITCH_TO_SIGNUP' })}
//                   className="text-primary"
//                 >
//                   I don't have an account? Sign up
//                 </button>
//               ) : (
//                 <button
//                   onClick={() => send({ type: 'SWITCH_TO_LOGIN' })}
//                   className="text-primary"
//                 >
//                   I have an account? Sign in
//                 </button>
//               )}
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

// export default Auth
