import { createContext } from 'react'

interface BotDetectionState {
  isBot: boolean
  reason: string
  confidence: 'high' | 'medium' | 'low'
  isChecked: boolean
}

export interface BotProtectionContextType {
  detection: BotDetectionState
  /** Use this to conditionally hide/protect sensitive content */
  shouldProtect: boolean
}

export const BotProtectionContext = createContext<BotProtectionContextType | null>(null)
