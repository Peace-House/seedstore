import './styles.css'
import 'react-photo-view/dist/react-photo-view.css'

import { LiteralProvider } from '@literal-ui/core'
import { ErrorBoundary } from '@sentry/nextjs'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { RecoilRoot } from 'recoil'

// import { Layout, Theme } from '../components'
import { Theme } from '../components'
import { Layout } from '../components/layout/Layout'

export default function MyApp({ Component, pageProps }: AppProps) {

  // if (router.pathname === '/success') return <Component {...pageProps} />

  useEffect(() => {
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
      document.removeEventListener('copy', preventCopy, true)
      document.removeEventListener('cut', preventCopy, true)
      document.removeEventListener('keydown', preventScreenshot, true)
      document.removeEventListener('keydown', preventDevTools, true)
      document.removeEventListener('contextmenu', preventContextMenu, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // clearInterval(devToolsInterval)
    }
  }, [])

  return (
    <ErrorBoundary fallback={<Fallback />}>
      <LiteralProvider {...({} as any)} >
        <RecoilRoot>
          <Theme />
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </RecoilRoot>
      </LiteralProvider>
    </ErrorBoundary>
  )
}

const Fallback: React.FC = () => {
  return <div>Something went wrong.</div>
}
