import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import { isAuthenticated } from '../services/authService'

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login']

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    // Check if current page is public
    const isPublicPage = PUBLIC_PAGES.some(page => router.pathname.startsWith(page))
    
    if (isPublicPage) {
      setIsChecking(false)
      setIsAuthed(true)
      return
    }

    // Check authentication
    const authenticated = isAuthenticated()
    
    if (!authenticated) {
      // Redirect to login with return URL
      const returnUrl = router.asPath !== '/' ? `?redirect=${encodeURIComponent(router.asPath)}` : ''
      router.replace(`/login${returnUrl}`)
    } else {
      setIsAuthed(true)
    }
    
    setIsChecking(false)
  }, [router])

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4"
            viewBox="0 0 24 24"
          >
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
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated (will redirect)
  if (!isAuthed) {
    return null
  }

  return <>{children}</>
}
