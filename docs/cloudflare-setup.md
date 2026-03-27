# CloudFlare Configuration for Advanced Think Tank

## DNS Setup
- A record: et.advanced-think-tank.com → 46.224.81.90 (Proxied/Orange cloud)

## SSL/TLS
- Mode: Full (Strict) — server has Let's Encrypt cert
- Always Use HTTPS: On
- Minimum TLS: 1.2
- Automatic HTTPS Rewrites: On

## Security
- Security Level: Medium
- Bot Fight Mode: On
- Browser Integrity Check: On
- Challenge Passage: 30 minutes

## Speed
- Auto Minify: JavaScript, CSS, HTML
- Brotli: On
- Early Hints: On

## Caching
- Browser Cache TTL: Respect Existing Headers
- Caching Level: Standard
- Always Online: On

## Page Rules (optional)
- /webhook/*: Cache Level: Bypass, Security Level: Essentially Off (for n8n)
