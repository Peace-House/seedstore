import { useContext } from 'react'
import { BotProtectionContext, BotProtectionContextType } from '@/contexts/BotProtectionContextDef'

/**
 * Hook to access bot detection state
 * 
 * Usage:
 * ```tsx
 * const { detection, shouldProtect } = useBotProtection()
 * 
 * // Optionally hide sensitive content
 * if (shouldProtect) {
 *   return <div>Content not available</div>
 * }
 * ```
 */
export function useBotProtection(): BotProtectionContextType {
  const context = useContext(BotProtectionContext)
  
  // Return safe defaults if used outside provider
  if (!context) {
    return {
      detection: {
        isBot: false,
        reason: 'no-provider',
        confidence: 'low',
        isChecked: false,
      },
      shouldProtect: false,
    }
  }
  
  return context
}
