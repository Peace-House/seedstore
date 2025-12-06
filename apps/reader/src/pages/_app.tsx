import './styles.css'
import 'react-photo-view/dist/react-photo-view.css'

import { LiteralProvider } from '@literal-ui/core'
import { ErrorBoundary } from '@sentry/nextjs'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { RecoilRoot } from 'recoil'

// import { Layout, Theme } from '../components'
import { Theme } from '../components'
import { AuthGuard } from '../components/AuthGuard'
import { Layout } from '../components/layout/Layout'
import { detectBot, logBotDetection } from '../botProtection'

/**
 * Blocked page component shown to AI bots
 */
function BotBlockedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        maxWidth: '28rem',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{
          width: '4rem',
          height: '4rem',
          backgroundColor: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <svg 
            style={{ width: '2rem', height: '2rem', color: '#dc2626' }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>
          Access Denied
        </h1>
        <p style={{ color: '#4b5563', marginBottom: '1rem' }}>
          Automated access to this website is not permitted.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          If you believe this is an error, please try accessing the site from a regular browser.
        </p>
      </div>
    </div>
  )
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [botBlocked, setBotBlocked] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  
  // Pages that should not have Layout wrapper
  const isLoginPage = router.pathname === '/login'

  // if (router.pathname === '/success') return <Component {...pageProps} />

  useEffect(() => {
    // Bot detection - runs once on mount
    const runBotDetection = () => {
      const detection = detectBot()
      setIsChecked(true)
      
      if (detection.isBot && (detection.confidence === 'high' || detection.confidence === 'medium')) {
        logBotDetection(detection)
        console.log('[Bot Detected & Blocked]', detection)
        setBotBlocked(true)
        
        // Send to analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'bot_blocked', {
            reason: detection.reason,
            confidence: detection.confidence,
          })
        }
      }
    }
    
    // Run after a short delay to allow page to hydrate
    const botDetectionTimer = setTimeout(runBotDetection, 150)

    // Add global content protection
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const preventScreenshot = (e: KeyboardEvent) => {
      // Prevent screenshot shortcuts
      if (
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
        e.key === 'PrintScreen' ||
        (e.altKey && e.key === 'PrintScreen') ||
        (e.metaKey && e.key === 'PrintScreen')
      ) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Prevent copy shortcuts (Ctrl+C, Cmd+C) when reading a book
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const target = e.target as HTMLElement
        // Only prevent if we're in the reader area (not in input fields)
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
      }
    }

    const preventContextMenu = (e: MouseEvent) => {
      // Prevent context menu everywhere in the reader app
      e.preventDefault()
      return false
    }

    // Prevent DevTools keyboard shortcuts
    const preventDevTools = (e: KeyboardEvent) => {
      // F12 - DevTools
      if (e.key === 'F12') {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Ctrl+Shift+I / Cmd+Option+I - Inspect Element
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Ctrl+Shift+J / Cmd+Option+J - Console
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Ctrl+Shift+C / Cmd+Option+C - Inspect Element (alternative)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Ctrl+U / Cmd+U - View Source
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Ctrl+S / Cmd+S - Save Page
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      
      // Ctrl+P / Cmd+P - Print
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    document.addEventListener('copy', preventCopy, true)
    document.addEventListener('cut', preventCopy, true)
    document.addEventListener('keydown', preventScreenshot, true)
    document.addEventListener('keydown', preventDevTools, true)
    document.addEventListener('contextmenu', preventContextMenu, true)

    // Blur content when tab loses focus (potential screenshot attempt)
    const handleVisibilityChange = () => {
      const readerContent = document.querySelector('.Reader, iframe, .book-content')
      if (readerContent) {
        if (document.hidden) {
          (readerContent as HTMLElement).style.filter = 'blur(10px)'
        } else {
          (readerContent as HTMLElement).style.filter = 'none'
        }
      }
    }

    // Detect screen capture API usage (modern browsers only)
    const detectScreenCapture = async () => {
      try {
        if ('mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices) {
          // Monitor for display capture - this is just a detection, can't prevent
          const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
          navigator.mediaDevices.getDisplayMedia = async (constraints) => {
            console.warn('[Security] Screen capture attempt detected')
            // Could show a warning or log this
            return originalGetDisplayMedia(constraints)
          }
        }
      } catch (e) {
        // Silent fail - some browsers don't support this
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    detectScreenCapture()

    // Detect if DevTools is open (via debugger timing)
    const detectDevTools = () => {
      const threshold = 160
      const start = performance.now()
      // debugger statement causes a pause if DevTools is open
      // eslint-disable-next-line no-debugger
      debugger
      const end = performance.now()
      if (end - start > threshold) {
        // DevTools detected - blur content
        const readerContent = document.querySelector('.Reader, iframe, .book-content')
        if (readerContent) {
          (readerContent as HTMLElement).style.filter = 'blur(20px)'
        }
      }
    }
    
    // Check periodically (but not too frequently to avoid performance issues)
    // Disabled by default as it can be annoying during development
    // const devToolsInterval = setInterval(detectDevTools, 2000)

    return () => {
      clearTimeout(botDetectionTimer)
      document.removeEventListener('copy', preventCopy, true)
      document.removeEventListener('cut', preventCopy, true)
      document.removeEventListener('keydown', preventScreenshot, true)
      document.removeEventListener('keydown', preventDevTools, true)
      document.removeEventListener('contextmenu', preventContextMenu, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // clearInterval(devToolsInterval)
    }
  }, [])

  // Block bots after detection
  if (isChecked && botBlocked) {
    return <BotBlockedPage />
  }

  // Login page doesn't need Layout or AuthGuard
  if (isLoginPage) {
    return (
      <ErrorBoundary fallback={<Fallback />}>
        <LiteralProvider {...({} as any)} >
          <RecoilRoot>
            <Theme />
            <Component {...pageProps} />
          </RecoilRoot>
        </LiteralProvider>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary fallback={<Fallback />}>
      <LiteralProvider {...({} as any)} >
        <RecoilRoot>
          <Theme />
          <AuthGuard>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </AuthGuard>
        </RecoilRoot>
      </LiteralProvider>
    </ErrorBoundary>
  )
}

const Fallback: React.FC = () => {
  return <div>Something went wrong.</div>
}
