import { z } from 'zod'
import { useEffect, useState } from 'react'
import { getCountries, getStates } from '@/services/location'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, Loader2, Eye, EyeOff } from 'lucide-react'
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
import { retrievePHCode } from '@/services/user'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Copy, Check } from 'lucide-react'
import { set } from 'date-fns'

const Auth = () => {
  const [searchParams] = useSearchParams()
  const goto = searchParams.get('redirect')
  const admin_email = searchParams.get('email')
  const token = searchParams.get('token')

  const [isLogin, setIsLogin] = useState(admin_email && token ? false : true)
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
  const [PhCode, setPhCode] = useState('EKE22-F2345FG')

  // Retrieval related state
  const [retrieveMethod, setRetrieveMethod] = useState<
    'phone' | 'email' | 'dob' | null
  >(null)
  const [showRetrieveModal, setShowRetrieveModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [retrievedPhCode, setRetrievedPhCode] = useState('')
  const [retrieveSource, setRetrieveSource] = useState<
    'legacy' | 'signup' | null
  >(null)
  const [retrieveMessage, setRetrieveMessage] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [surname, setSurname] = useState('')

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

  useEffect(() => {
    setPhoneNumber('')
    setEmail('')
    setBirthDay('')
    setBirthMonth('')
    setBirthYear('')
  }, [retrieveMethod])

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
          email,
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
      <Card className="border-primary relative w-full max-w-md border-[0.5px] shadow-lg">
        <button onClick={() => navigate('/')} className="absolute top-3 left-3">
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
              ? 'Welcome Back'
              : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Sign in to access your library'
              : showSignUpSuccessfulModal
              ? 'You can now log in to your account.'
              : 'Sign up to start reading'}
          </CardDescription>
          <CardDescription className="rounded-md bg-red-50 px-2 py-3  text-xs text-red-600 md:px-12">
            {isLogin
              ? 'Your PHCode & Password On Registration.livingseed will also work here.'
              : 'Your account will also work on Registration.livingseed'}
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
                    className="w-full"
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
                    placeholder="Enter Firstname"
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
                    placeholder="Enter Lastname"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}
            {isLogin && !showSignUpSuccessfulModal && (
              <div className="space-y-1">
                <Label htmlFor="email">PH-Code</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your PHCode"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
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
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {!isLogin && admin_email && token && (
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
                className="!bg-primary !mt-8 mb-3 w-full !text-white shadow-lg"
                disabled={
                  isSubmitting ||
                  loading ||
                  (!isLogin && password !== confirmPassword) ||
                  (isLogin && (!email || !password))
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
                    onClick={() => setShowRetrieveModal(true)}
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

      <Dialog open={showRetrieveModal} onOpenChange={setShowRetrieveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retrieve PH Code</DialogTitle>
            <DialogDescription>
              Select a method to retrieve your PH Code.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setIsSubmitting(true)

              try {
                const payload: any = { surname }

                if (retrieveMethod === 'phone') {
                  payload.phoneNumber = phoneNumber
                }

                if (retrieveMethod === 'email') {
                  payload.email = email
                }

                if (retrieveMethod === 'dob') {
                  payload.day = birthDay
                  payload.month = birthMonth
                  payload.year = birthYear
                }

                const res = await retrievePHCode(payload)

                if (res.success && res.phcode) {
                  setRetrievedPhCode(res.phcode)
                  setRetrieveSource(res.source || 'legacy')
                  setRetrieveMessage(res.message || '')
                  setShowResultModal(true)
                  setShowRetrieveModal(false)
                }
              } catch (error: any) {
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description:
                    error.response?.data?.message ||
                    'Failed to retrieve PH Code',
                })
              } finally {
                setIsSubmitting(false)
              }
            }}
            className="space-y-4 py-4"
          >
            {/* STEP 1: SELECT METHOD */}
            {!retrieveMethod && (
              <div className="space-y-4">
                <Button
                  type="button"
                  onClick={() => setRetrieveMethod('phone')}
                  className="outline-primary w-full rounded-full outline"
                >
                  Retrieve with Phone Number
                </Button>

                <Button
                  type="button"
                  onClick={() => setRetrieveMethod('email')}
                  className="w-full rounded-full outline"
                >
                  Retrieve with Email
                </Button>

                <Button
                  type="button"
                  onClick={() => setRetrieveMethod('dob')}
                  className="w-full rounded-full outline"
                >
                  Retrieve with Date of Birth
                </Button>
              </div>
            )}

            {/* STEP 2: INPUT FORM */}
            {retrieveMethod && (
              <>
                <button
                  type="button"
                  onClick={() => setRetrieveMethod(null)}
                  className="text-sm text-gray-500 underline"
                >
                  ← Change method
                </button>

                {/* SURNAME */}
                <div className="space-y-1">
                  <Label>Surname</Label>
                  <Input
                    placeholder="Enter your surname"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    required
                  />
                </div>

                {/* PHONE */}
                {retrieveMethod === 'phone' && (
                  <div className="space-y-1">
                    <Label>Phone Number</Label>
                    <Input
                      placeholder="Enter your phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* EMAIL */}
                {retrieveMethod === 'email' && (
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* DOB */}
                {retrieveMethod === 'dob' && (
                  <div>
                    <Label>Date of Birth</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Day"
                        type="number"
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Month"
                        type="number"
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Year"
                        type="number"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <Button
                  variant="default"
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    !surname ||
                    (retrieveMethod === 'phone' && !phoneNumber) ||
                    (retrieveMethod === 'email' && !email) ||
                    (retrieveMethod === 'dob' &&
                      (!birthDay || !birthMonth || !birthYear))
                  }
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Retrieve PH Code
                </Button>
              </>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Retrieve PH Code Modal */}
      {/* <Dialog open={showRetrieveModal} onOpenChange={setShowRetrieveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retrieve PH Code</DialogTitle>
            <DialogDescription>
              Enter your details to retrieve your PH Code from our system.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setIsSubmitting(true)
              try {
                const res = await retrievePHCode({
                  surname,
                  phoneNumber,
                  email,
                  day: birthDay,
                  month: birthMonth,
                  year: birthYear,
                })
                if (res.success && res.phcode) {
                  setRetrievedPhCode(res.phcode)
                  setRetrieveSource(res.source || 'legacy')
                  setRetrieveMessage(res.message || '')
                  setShowResultModal(true)
                  setShowRetrieveModal(false)
                }
              } catch (error: any) {
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description:
                    error.response?.data?.message ||
                    'Failed to retrieve PH Code',
                })
              } finally {
                setIsSubmitting(false)
              }
            }}
            className="space-y-4 py-4"
          >
            <div className="grid grid-cols-2 gap-x-2">
              <div className="space-y-1">
                <Label htmlFor="retrieve-surname">Surname</Label>
                <Input
                  id="retrieve-surname"
                  placeholder="Enter your surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="retrieve-phone">Phone Number</Label>
                <Input
                  id="retrieve-phone"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="retrieve-email">Email</Label>
              <Input
                id="retrieve-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="mb-2">
                <Label htmlFor="retrieve-email">Date of Birth</Label>
              </div>

              <div className="grid grid-cols-3 gap-x-2">
                <div className="space-y-0">
                  <Input
                    id="retrieve-day"
                    placeholder="day"
                    value={birthDay}
                    type="number"
                    onChange={(e) => setBirthDay(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-0">
                  <Input
                    id="retrieve-month"
                    placeholder="month"
                    value={birthMonth}
                    type="number"
                    onChange={(e) => setBirthMonth(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-0">
                  <Input
                    id="retrieve-year"
                    placeholder="year"
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            <br />
            <Button
              variant="default"
              type="submit"
              className="w-full"
              disabled={
                isSubmitting ||
                !surname ||
                !phoneNumber ||
                !email ||
                !birthDay ||
                !birthMonth ||
                !birthYear
              }
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Retrieve PH Code
            </Button>
          </form>
        </DialogContent>
      </Dialog> */}

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>PH Code Retrieved</DialogTitle>
            <DialogDescription>
              Your PH Code has been successfully retrieved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4 text-center">
            <div className="bg-primary/10 border-primary/20 flex w-full items-center justify-between rounded-lg border p-4">
              <code className="text-primary text-xl font-bold tracking-wider">
                {retrievedPhCode}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(retrievedPhCode)
                  setIsCopied(true)
                  setTimeout(() => setIsCopied(false), 2000)
                }}
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {retrieveSource === 'signup' && (
              <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">
                Please login with this PHCode going forward on seedstore and all
                Peacehouse platforms.
              </p>
            )}

            <Button
              className="w-full"
              variant="default"
              onClick={() => {
                setEmail(retrievedPhCode)
                setShowResultModal(false)
                setIsLogin(true)
                setRetrieveMethod(null)
                setSurname('')
                setPhoneNumber('')
                setBirthDay('')
                setBirthMonth('')
                setBirthYear('')
              }}
            >
              Go to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Auth
