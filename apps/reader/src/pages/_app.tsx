import './styles.css'
import 'react-photo-view/dist/react-photo-view.css'

import { LiteralProvider } from '@literal-ui/core'
import { ErrorBoundary } from '@sentry/nextjs'
import type { AppProps } from 'next/app'
import { RecoilRoot } from 'recoil'

// import { Layout, Theme } from '../components'
import { Theme } from '../components'
import { Layout } from '../components/layout/Layout'

export default function MyApp({ Component, pageProps }: AppProps) {

  // if (router.pathname === '/success') return <Component {...pageProps} />

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
