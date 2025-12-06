import { useEffect, useState, useCallback } from 'react'
import { detectBot, logBotDetection } from '@/utils/botProtection'

interface BotDetectionResult {
  isBot: boolean
  reason: string
  confidence: 'high' | 'medium' | 'low'
  isLoading: boolean
}

/**
 * Hook to detect bots on the client side
 * Returns bot detection status and can optionally block bots
 */
export function useBotDetection(options?: {
  blockBots?: boolean
  onBotDetected?: (result: BotDetectionResult) => void
}): BotDetectionResult {
  const [result, setResult] = useState<BotDetectionResult>({
    isBot: false,
    reason: 'checking',
    confidence: 'low',
    isLoading: true,
  })

  const handleBotDetected = useCallback(
    (finalResult: BotDetectionResult) => {
      options?.onBotDetected?.(finalResult)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    // Delay detection slightly to allow page to fully load
    const timer = setTimeout(() => {
      const detection = detectBot()
      
      const finalResult: BotDetectionResult = {
        ...detection,
        isLoading: false,
      }
      
      setResult(finalResult)
      
      // Log bot detection
      if (detection.isBot) {
        logBotDetection(detection)
        handleBotDetected(finalResult)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [handleBotDetected])

  return result
}

/**
 * Hook to track and prevent rapid successive actions (bot behavior)
 */
export function useRateLimiter(maxActions: number = 5, windowMs: number = 10000) {
  const [actions, setActions] = useState<number[]>([])
  const [isLimited, setIsLimited] = useState(false)

  const recordAction = () => {
    const now = Date.now()
    const recentActions = actions.filter((time) => now - time < windowMs)
    
    if (recentActions.length >= maxActions) {
      setIsLimited(true)
      return false
    }
    
    setActions([...recentActions, now])
    setIsLimited(false)
    return true
  }

  const reset = () => {
    setActions([])
    setIsLimited(false)
  }

  return { isLimited, recordAction, reset }
}
