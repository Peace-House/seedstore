import { useEffect, useState, ReactNode } from 'react'
import { detectBot, logBotDetection } from '@/utils/botProtection'
import { BotProtectionContext } from './BotProtectionContextDef'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BotDetectionState {
  isBot: boolean
  reason: string
  confidence: 'high' | 'medium' | 'low'
  isChecked: boolean
}

interface BotProtectionProviderProps {
  children: ReactNode
  /** If true, detected bots will be blocked */
  enableProtection?: boolean
  /** Optional callback when a bot is detected */
  onBotDetected?: (detection: BotDetectionState) => void
}

/**
 * Blocked page component shown to AI bots
 */
function BotBlockedPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg 
            className="w-8 h-8 text-red-600" 
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
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Access Denied
        </h1>
        <p className="text-gray-600 mb-4">
          Automated access to this website is not permitted.
        </p>
        <p className="text-sm text-gray-500">
          If you believe this is an error, please try accessing the site from a regular browser.
        </p>
      </div>
    </div>
  )
}

/**
 * Global Bot Protection Provider
 * 
 * When enableProtection is true:
 * - Detects bots on initial load
 * - Blocks AI bots and scrapers from viewing the app
 * - Normal users see the app normally
 */
export function BotProtectionProvider({
  children,
  enableProtection = false,
  onBotDetected,
}: BotProtectionProviderProps) {
  const [detection, setDetection] = useState<BotDetectionState>({
    isBot: false,
    reason: 'unchecked',
    confidence: 'low',
    isChecked: false,
  })

  useEffect(() => {
    // Run detection after a short delay to allow page to fully hydrate
    const timer = setTimeout(() => {
      const result = detectBot()
      
      const state: BotDetectionState = {
        ...result,
        isChecked: true,
      }
      
      setDetection(state)
      
      // Log detection for analytics
      if (result.isBot) {
        logBotDetection(result)
        onBotDetected?.(state)
        
        // Send to analytics/logging service
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'bot_detected', {
            reason: result.reason,
            confidence: result.confidence,
          })
        }
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [onBotDetected])

  // Block if protection enabled AND bot detected (high or medium confidence)
  const shouldProtect = enableProtection && detection.isBot && 
    (detection.confidence === 'high' || detection.confidence === 'medium')

  // Show blocked page for bots when protection is enabled
  if (enableProtection && detection.isChecked && shouldProtect) {
    return <BotBlockedPage />
  }

  return (
    <BotProtectionContext.Provider value={{ detection, shouldProtect }}>
      {children}
    </BotProtectionContext.Provider>
  )
}

export default BotProtectionProvider
