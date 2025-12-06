import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// AI bot user agents to block
const AI_BOT_PATTERNS = [
  'GPTBot',
  'ChatGPT-User',
  'Google-Extended',
  'CCBot',
  'anthropic-ai',
  'Claude-Web',
  'ClaudeBot',
  'Bytespider',
  'Omgili',
  'Diffbot',
  'FacebookBot',
  'ImagesiftBot',
  'cohere-ai',
  'PerplexityBot',
  'YouBot',
  'Applebot-Extended',
  'Amazonbot',
  'meta-externalagent',
  'AI2Bot',
  'Ai2Bot-Dolma',
  'Scrapy',
  'DataForSeoBot',
  'img2dataset',
  'Bytedance',
]

// Headless browser patterns
const HEADLESS_PATTERNS = [
  'HeadlessChrome',
  'PhantomJS',
  'Selenium',
  'puppeteer',
  'playwright',
]

function isBlockedBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  
  // Check AI bots
  for (const pattern of AI_BOT_PATTERNS) {
    if (ua.includes(pattern.toLowerCase())) {
      return true
    }
  }
  
  // Check headless browsers
  for (const pattern of HEADLESS_PATTERNS) {
    if (ua.includes(pattern.toLowerCase())) {
      return true
    }
  }
  
  return false
}

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  
  // Block known AI bots and scrapers
  if (isBlockedBot(userAgent)) {
    console.log(`[Bot Blocked] UA: ${userAgent}, Path: ${request.nextUrl.pathname}`)
    
    return new NextResponse(
      JSON.stringify({ error: 'Access denied' }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Robots-Tag': 'noindex, nofollow, noai, noimageai',
        },
      }
    )
  }
  
  // Add security headers to all responses
  const response = NextResponse.next()
  
  // Anti-AI/scraping headers
  response.headers.set('X-Robots-Tag', 'noai, noimageai')
  
  // Prevent content embedding
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self'")
  
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  return response
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, manifest, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox).*)',
  ],
}
