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
      const target = e.target as HTMLElement
      // Only prevent context menu in the reader area
      if (target.closest('.Reader') || target.closest('iframe')) {
        e.preventDefault()
        return false
      }
    }

    document.addEventListener('copy', preventCopy, true)
    document.addEventListener('cut', preventCopy, true)
    document.addEventListener('keydown', preventScreenshot, true)
    document.addEventListener('contextmenu', preventContextMenu, true)

    return () => {
      document.removeEventListener('copy', preventCopy, true)
      document.removeEventListener('cut', preventCopy, true)
      document.removeEventListener('keydown', preventScreenshot, true)
      document.removeEventListener('contextmenu', preventContextMenu, true)
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
