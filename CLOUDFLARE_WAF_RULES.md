# Cloudflare WAF Rules for Bot Protection
# These rules should be configured in your Cloudflare dashboard

## Rule 1: Block AI Crawlers by User Agent
# Expression:
# (http.user_agent contains "GPTBot") or
# (http.user_agent contains "ChatGPT-User") or
# (http.user_agent contains "Google-Extended") or
# (http.user_agent contains "CCBot") or
# (http.user_agent contains "anthropic-ai") or
# (http.user_agent contains "Claude-Web") or
# (http.user_agent contains "ClaudeBot") or
# (http.user_agent contains "Bytespider") or
# (http.user_agent contains "Omgili") or
# (http.user_agent contains "Diffbot") or
# (http.user_agent contains "FacebookBot") or
# (http.user_agent contains "cohere-ai") or
# (http.user_agent contains "PerplexityBot") or
# (http.user_agent contains "YouBot") or
# (http.user_agent contains "Amazonbot") or
# (http.user_agent contains "meta-externalagent") or
# (http.user_agent contains "AI2Bot") or
# (http.user_agent contains "img2dataset")
#
# Action: Block

## Rule 2: Block Headless Browsers
# Expression:
# (http.user_agent contains "HeadlessChrome") or
# (http.user_agent contains "PhantomJS") or
# (http.user_agent contains "Selenium") or
# (http.user_agent contains "puppeteer") or
# (http.user_agent contains "playwright")
#
# Action: Block

## Rule 3: Block Common Scrapers
# Expression:
# (http.user_agent contains "Scrapy") or
# (http.user_agent contains "python-requests") or
# (http.user_agent contains "Go-http-client") or
# (http.user_agent contains "curl/") or
# (http.user_agent contains "wget/")
#
# Action: Challenge (shows CAPTCHA)

## Rule 4: Rate Limiting
# Path: /*
# Requests per 10 seconds: 50
# Action: Challenge

## Rule 5: Block Empty User Agents
# Expression:
# (not http.user_agent matches ".+")
#
# Action: Block

## Rule 6: Bot Fight Mode
# Enable Bot Fight Mode in Cloudflare Security settings
# This automatically challenges suspected bots

---

# Cloudflare Transform Rules (Response Headers)

## Add Anti-AI Headers to All Responses
# Expression: true (all requests)
# Set response header:
#   X-Robots-Tag: noai, noimageai

---

# Recommended Cloudflare Settings

1. Security Level: Medium or High
2. Bot Fight Mode: Enabled
3. Challenge Passage: 30 minutes
4. Browser Integrity Check: Enabled
5. Privacy Pass Support: Enabled

---

# Known AI Crawler IP Ranges (for additional blocking)

# OpenAI (GPTBot)
# 20.15.240.64/28
# 20.15.240.80/28
# 20.15.240.96/28
# 20.15.240.176/28
# 20.15.241.0/28
# 20.15.242.128/28
# 20.15.242.144/28
# 20.15.242.192/28
# 40.83.2.64/28

# Anthropic Claude
# Check their official documentation for current IP ranges

# Common Crawl (CCBot)
# Various AWS IP ranges - block by user agent instead

---

# How to Apply These Rules

1. Log in to Cloudflare Dashboard
2. Select your domain
3. Go to Security > WAF > Custom rules
4. Create new rules using the expressions above
5. Set appropriate actions (Block, Challenge, or JS Challenge)
6. Order rules by priority (most specific first)

# For IP-based blocking:
1. Go to Security > WAF > Tools
2. Add IP ranges to block list
3. Or use Access Rules for country-based blocking
