/**
 * Bot Protection Utilities
 * Detects and blocks AI crawlers, scrapers, and automated bots
 */

// Known AI bot user agents
const AI_BOT_PATTERNS = [
  /GPTBot/i,
  /ChatGPT-User/i,
  /Google-Extended/i,
  /CCBot/i,
  /anthropic-ai/i,
  /Claude-Web/i,
  /ClaudeBot/i,
  /Bytespider/i,
  /Omgili/i,
  /Diffbot/i,
  /FacebookBot/i,
  /ImagesiftBot/i,
  /cohere-ai/i,
  /PerplexityBot/i,
  /YouBot/i,
  /Applebot-Extended/i,
  /Amazonbot/i,
  /meta-externalagent/i,
  /AI2Bot/i,
  /Ai2Bot-Dolma/i,
  /Scrapy/i,
  /PetalBot/i,
  /DataForSeoBot/i,
  /Barkrowler/i,
  /peer39_crawler/i,
  /webz\.io/i,
  /Kangaroo Bot/i,
  /Timpibot/i,
  /img2dataset/i,
  /Bytedance/i,
]

// Generic bot patterns (headless browsers, automation tools)
const GENERIC_BOT_PATTERNS = [
  /HeadlessChrome/i,
  /PhantomJS/i,
  /Selenium/i,
  /WebDriver/i,
  /puppeteer/i,
  /playwright/i,
  /Nightmare/i,
  /CURL/i,
  /wget/i,
  /python-requests/i,
  /axios/i,
  /node-fetch/i,
  /Go-http-client/i,
  /Java\//i,
  /libwww/i,
  /httpunit/i,
  /nutch/i,
  /biglotron/i,
  /teoma/i,
  /convera/i,
  /gigablast/i,
  /ia_archiver/i,
]

/**
 * Check if the current user agent is a known AI bot
 */
export function isAIBot(userAgent?: string): boolean {
  const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  return AI_BOT_PATTERNS.some((pattern) => pattern.test(ua))
}

/**
 * Check if the current user agent is a generic bot/scraper
 */
export function isGenericBot(userAgent?: string): boolean {
  const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  return GENERIC_BOT_PATTERNS.some((pattern) => pattern.test(ua))
}

/**
 * Check if the current user agent is any type of bot
 */
export function isBot(userAgent?: string): boolean {
  return isAIBot(userAgent) || isGenericBot(userAgent)
}

/**
 * Detect headless browser characteristics
 */
export function detectHeadlessBrowser(): boolean {
  if (typeof window === 'undefined') return true

  const checks = [
    // Check for webdriver
    () => !!(navigator as any).webdriver,
    // Check for automation flags
    () => !!(window as any).callPhantom || !!(window as any)._phantom,
    // Check for Selenium
    () => !!document.documentElement.getAttribute('webdriver'),
    // Check for missing plugins (common in headless)
    () => navigator.plugins.length === 0,
    // Check for missing languages
    () => !navigator.languages || navigator.languages.length === 0,
    // Check for Puppeteer/Playwright flags
    () => !!(window as any).__puppeteer_evaluation_script__,
    () => !!(window as any).__playwright,
    // Check for automation controlled
    () => !!(navigator as any).webdriver,
    // Chrome headless detection
    () => {
      const ua = navigator.userAgent.toLowerCase()
      return ua.includes('headless')
    },
    // Check for missing screen dimensions (common in headless)
    () => window.outerWidth === 0 || window.outerHeight === 0,
  ]

  return checks.some((check) => {
    try {
      return check()
    } catch {
      return false
    }
  })
}

/**
 * Detect bot-like behavior patterns
 */
export function detectBotBehavior(): boolean {
  if (typeof window === 'undefined') return true

  const suspicious: boolean[] = []

  // Check for missing or suspicious properties
  try {
    // Bots often don't have proper notification support
    suspicious.push(!('Notification' in window))
  } catch {
    suspicious.push(true)
  }

  try {
    // Check for DevTools protocol
    suspicious.push(!!(window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array)
    suspicious.push(!!(window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise)
  } catch {
    // Ignore
  }

  // If more than 2 suspicious indicators, likely a bot
  return suspicious.filter(Boolean).length >= 2
}

/**
 * Comprehensive bot detection
 */
export function detectBot(): {
  isBot: boolean
  reason: string
  confidence: 'high' | 'medium' | 'low'
} {
  if (typeof window === 'undefined') {
    return { isBot: true, reason: 'server-side', confidence: 'low' }
  }

  // Check user agent
  if (isAIBot()) {
    return { isBot: true, reason: 'ai-bot-user-agent', confidence: 'high' }
  }

  if (isGenericBot()) {
    return { isBot: true, reason: 'generic-bot-user-agent', confidence: 'high' }
  }

  // Check headless browser
  if (detectHeadlessBrowser()) {
    return { isBot: true, reason: 'headless-browser', confidence: 'medium' }
  }

  // Check behavior
  if (detectBotBehavior()) {
    return { isBot: true, reason: 'bot-behavior', confidence: 'medium' }
  }

  return { isBot: false, reason: 'human', confidence: 'high' }
}

/**
 * Log bot detection event (for analytics)
 */
export function logBotDetection(detection: ReturnType<typeof detectBot>): void {
  if (detection.isBot && typeof window !== 'undefined') {
    console.warn('[Bot Detection]', {
      reason: detection.reason,
      confidence: detection.confidence,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    })
  }
}
