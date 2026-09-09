/**
 * Microsoft Clarity — session replay, heatmaps and click analytics.
 *
 * Loaded from `main.tsx` at boot. Kept in a module (rather than pasted
 * into index.html) so it can be gated on an env var, skipped in dev, and
 * so the helper APIs below are typed.
 *
 * Enable by setting `VITE_CLARITY_PROJECT_ID`. Unset = no script at all,
 * which keeps local dev and Vercel previews out of the production data.
 *
 * ─── Privacy ──────────────────────────────────────────────────────────
 * Clarity records the DOM. This app shows emails, PH-Codes, addresses and
 * checkout screens, so:
 *   • Set the masking mode in the Clarity dashboard (Settings → Masking).
 *   • Add `data-clarity-mask="true"` to any element whose contents must
 *     never appear in a recording, or `data-clarity-unmask="true"` to opt
 *     an element back in inside a masked region.
 * Clarity masks <input>, <textarea> and password fields by default, but
 * text rendered into a <div> (an email on a profile page, a PH-Code on a
 * confirmation screen) is NOT masked automatically.
 */

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] }

declare global {
  interface Window {
    clarity?: ClarityFn
  }
}

const PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID as
  | string
  | undefined

let loaded = false

/** Injects the Clarity tag. Safe to call more than once. */
export function initClarity(): void {
  if (loaded) return
  if (!PROJECT_ID) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  loaded = true

  // Official Clarity tag, transcribed rather than eval'd from a string so
  // it stays readable and lint-visible. The stub queues any calls made
  // before the real script finishes loading; Clarity drains `q` on init.
  if (!window.clarity) {
    const stub: ClarityFn = (...args: unknown[]) => {
      stub.q = stub.q || []
      stub.q.push(args)
    }
    stub.q = []
    window.clarity = stub
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${PROJECT_ID}`
  const first = document.getElementsByTagName('script')[0]
  first?.parentNode?.insertBefore(script, first)
}

/** True when the tag has been injected. */
export const clarityEnabled = (): boolean => Boolean(PROJECT_ID)

/**
 * Identify the signed-in user so a reported problem can be traced to a
 * recording.
 *
 * Pass the NUMERIC user id — never the PH-Code, email or phone. A
 * PH-Code identifies a real person across every Peacehouse platform, and
 * Microsoft advise against sending PII here.
 */
export function clarityIdentify(userId: string | number): void {
  if (!window.clarity) return
  window.clarity('identify', String(userId))
}

/** Tag the session so it can be filtered on the dashboard (no PII). */
export function claritySetTag(key: string, value: string): void {
  if (!window.clarity) return
  window.clarity('set', key, value)
}

/** Record a named event, e.g. 'checkout_started'. */
export function clarityEvent(name: string): void {
  if (!window.clarity) return
  window.clarity('event', name)
}

/**
 * Apply the user's cookie/analytics consent choice.
 *
 * Nigeria's NDPR and the EU GDPR both treat session recording as
 * personal-data processing. If a consent banner is added, call this with
 * the answer; until then Clarity runs under the site's existing
 * cookie/analytics disclosure (the reader already ships GTM).
 */
export function claritySetConsent(granted: boolean): void {
  if (!window.clarity) return
  window.clarity('consent', granted)
}
