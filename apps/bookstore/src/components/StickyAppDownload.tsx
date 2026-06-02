import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from './ui/button'

// Canonical store URLs — kept in sync with the constants in
// `services/admin.ts` and `AppDownload.tsx`.
const STORE_URLS = {
  appStore: 'https://apps.apple.com/us/app/living-seed/id6762559749',
  playStore:
    'https://play.google.com/store/apps/details?id=com.livingseed.seedapp',
}

/// Cheap UA-based detection. Routes Apple devices (iPhone / iPad /
/// iPod / Mac) to the App Store and everyone else to Google Play. UA
/// parsing is "good enough" for a download CTA — false negatives just
/// send the user to Play Store, which still has a "view in App Store
/// instead" path on iOS browsers.
const isAppleDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod|macintosh|mac os x/.test(ua)
}

/// Mobile-only sticky download CTA at the top of the landing page.
///
/// Slides in once the user scrolls past the inline `<AppDownload />`
/// in the Hero, then sits there as a one-tap install affordance.
/// Single button (instead of two side-by-side store badges) because:
///   1. UA detection sends the user to the *correct* store
///      automatically — no risk of an iPhone user tapping the Play
///      Store button.
///   2. One compact button takes ~half the horizontal real estate, so
///      the sticky bar stays slim on narrow screens.
///   3. Mirrors the divest-website pattern (`DownloadTheApp`), which
///      this codebase has already standardised on for app-install
///      affordances.
const StickyAppDownload = () => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Show once the user has scrolled past the inline AppDownload in
    // the Hero. Slight hysteresis between show/hide thresholds avoids
    // flicker when scrubbing right at the boundary.
    const SHOW_AT = 280
    const HIDE_AT = 240

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setShow((prev) => (prev ? y > HIDE_AT : y > SHOW_AT))
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const handleClick = () => {
    const url = isAppleDevice() ? STORE_URLS.appStore : STORE_URLS.playStore
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      aria-hidden={!show}
      className={`bg-background/95 supports-[backdrop-filter]:bg-background/75 fixed left-0 right-0 top-0 z-50 rounded-bl-3xl rounded-br-3xl border-b backdrop-blur-md transition-transform duration-300 ease-out md:hidden ${
        show ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-2 py-2">
        <div className="flex items-center gap-0">
          {/* Brand mark — same Cloudinary asset the Navbar's <Logo />
              uses, sized down to fit the sticky strip. Inline <img>
              instead of importing <Logo /> because the Logo wraps in
              a `<Link to="/">` which would conflict with the bar's
              own click-to-store behaviour for users who tap the
              brand by accident. Just decoration here. */}
          <img
            src="https://res.cloudinary.com/caresskakka/image/upload/v1764939287/logo_eszpbe.png"
            alt=""
            className="h-9 w-auto"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-foreground text-sm font-semibold">
              Living Seed
            </span>
            <span className="text-muted-foreground text-xs">
              Read on the go — get the app
            </span>
          </div>
        </div>
        <Button
          onClick={handleClick}
          size="sm"
          liquidGlass={false}
          className="rounded-full"
          aria-label="Download the Living Seed app"
        >
          {/* <Download className="mr-1.5 h-4 w-4" /> */}
          Get the app
        </Button>
      </div>
    </div>
  )
}

export default StickyAppDownload
