import { ReactNode } from 'react'
import { useBotDetection } from '@/hooks/useBotDetection'

interface BotProtectionProps {
  children: ReactNode
  fallback?: ReactNode
  blockBots?: boolean
  onBotDetected?: () => void
}

/**
 * Component that wraps content and optionally blocks bots from viewing it
 */
export function BotProtection({
  children,
  fallback,
  blockBots = false,
  onBotDetected,
}: BotProtectionProps) {
  const { isBot, isLoading, confidence } = useBotDetection({
    onBotDetected: onBotDetected ? () => onBotDetected() : undefined,
  })

  // Only block if explicitly requested and we're confident it's a bot
  if (blockBots && !isLoading && isBot && confidence === 'high') {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          <p>This content is not available.</p>
        </div>
      )
    )
  }

  return <>{children}</>
}

export default BotProtection
