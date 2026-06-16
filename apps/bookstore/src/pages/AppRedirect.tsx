import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Device-detecting share/redirect landing page.
 *
 * A referral share link points at `https://seedstore.livingseed.org/r?ref=CODE`.
 * This page sniffs the visitor's device and forwards them to the correct app
 * store (with the referral code attached where the store supports it), so a
 * single link works for iPhone and Android alike. Desktop visitors get a
 * simple choice of both stores.
 *
 * Mirrors the Divest website's AppRedirect behaviour, adapted for SeedStore.
 */

// ─── Store + app constants ───────────────────────────────────────────────
const APP_STORE_URL = 'https://apps.apple.com/app/6762559749'
const PLAY_STORE_BASE =
  'https://play.google.com/store/apps/details?id=com.livingseed.seedapp'

// The SeedStore app registers this custom scheme (seedstore://) plus
// Universal Links / App Links for this domain. When the app is installed,
// tapping the https share link is intercepted by the OS and opens the app
// directly — this page only renders when the app is NOT installed, in which
// case the scheme attempt is a harmless no-op and the store redirect fires.
const APP_SCHEME = 'seedstore'

function detectPlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    (window as unknown as { opera?: string }).opera ||
    ''
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  if (isIOS) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

/** Normalise a referral code to the same A–Z0–9 shape the backend stores. */
function normalizeRef(raw: string | null): string {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
}

function playStoreUrl(ref: string): string {
  if (!ref) return PLAY_STORE_BASE
  // Play Store install referrer — the app can read this via the Install
  // Referrer API to attribute the signup to the referrer.
  const referrer = encodeURIComponent(`utm_source=referral&ref=${ref}`)
  return `${PLAY_STORE_BASE}&referrer=${referrer}`
}

const AppRedirect = () => {
  const [params] = useSearchParams()
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const ref = normalizeRef(params.get('ref'))

  useEffect(() => {
    const p = detectPlatform()
    setPlatform(p)

    // Deferred deep-linking: stash the code so a freshly-installed app can
    // claim it from the clipboard on first launch (best-effort; ignore
    // failures e.g. when the browser blocks clipboard access).
    if (ref) {
      void navigator.clipboard
        ?.writeText(`SEEDSTORE_REF_${ref}`)
        .catch(() => {})
    }

    if (p === 'ios' || p === 'android') {
      const store = p === 'ios' ? APP_STORE_URL : playStoreUrl(ref)

      // Try to open an already-installed app first (no-op until the scheme
      // is registered — see TODO above), then fall back to the store.
      const fallback = window.setTimeout(() => {
        window.location.replace(store)
      }, 1200)

      if (ref) {
        try {
          window.location.href = `${APP_SCHEME}://referral?ref=${encodeURIComponent(ref)}`
        } catch {
          /* scheme not registered yet — the timeout handles the store */
        }
      } else {
        window.clearTimeout(fallback)
        window.location.replace(store)
      }

      return () => window.clearTimeout(fallback)
    }
    // Desktop / other: render the chooser below (no auto-redirect).
  }, [ref])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-6 text-center">
      <img src="/logo.png" alt="SeedStore" className="h-16 w-16 rounded-xl" />
      <div>
        <h1 className="mb-2 text-2xl font-bold">Get the SeedStore app</h1>
        <p className="max-w-sm text-gray-600">
          {platform === 'other'
            ? 'Open this link on your phone, or choose your platform below.'
            : 'Redirecting you to the app store…'}
          {ref ? (
            <span className="mt-2 block text-sm text-gray-500">
              Referral code: <span className="font-semibold">{ref}</span>
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={APP_STORE_URL}
          className="rounded-lg bg-black px-6 py-3 font-semibold text-white"
        >
          Download on the App Store
        </a>
        <a
          href={playStoreUrl(ref)}
          className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white"
        >
          Get it on Google Play
        </a>
      </div>
    </div>
  )
}

export default AppRedirect
