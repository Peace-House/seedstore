import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md'

import { login, isAuthenticated } from '../services/authService'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect query param (where to go after login)
  const redirect = router.query.redirect as string | undefined

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(redirect || '/library')
    }
  }, [router, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login({ email, password })
      
      // Redirect to intended page or library
      router.replace(redirect || '/library')
    } catch (err: any) {
      const errorCode = err?.response?.data?.code
      const errorMessage = err?.response?.data?.message || err?.message || 'Login failed. Please try again.'
      
      if (errorCode === 'DEVICE_LIMIT_EXCEEDED') {
        setError('You can only be logged in on 3 devices. Please log out from another device to continue.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const bookstoreUrl = process.env.NEXT_PUBLIC_BOOKSTORE_URL

  return (
    <>
      <Head>
        <title>Login - Seedstore Reader</title>
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <img 
              src="https://res.cloudinary.com/caresskakka/image/upload/v1764939287/logo_eszpbe.png" 
              alt="Seedstore Logo" 
              className="w-[100px] h-20 mx-auto mb-4 rounded-2xl"
            />
            <h1 className="text-2xl font-bold text-white">Seedstore Reader</h1>
            <p className="text-gray-400 mt-2">Sign in to access your library</p>
          </div>

          {/* Login Card */}
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email or PH-Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MdEmail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email or PH-Code"
                    required
                    className="block w-full pl-10 pr-3 py-3 bg-green-700 border border-green-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MdLock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    className="block w-full pl-10 pr-10 py-3 bg-green-700 border border-green-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? (
                      <MdVisibilityOff className="h-5 w-5" />
                    ) : (
                      <MdVisibility className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full py-3 px-4 bg-green-900 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">Don&apos;t have an account?</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <a
              href={`${bookstoreUrl}/auth`}
              className="block w-full py-3 px-4 bg-transparent border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-lg text-center transition focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Create Account
            </a>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 text-sm mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </>
  )
}
