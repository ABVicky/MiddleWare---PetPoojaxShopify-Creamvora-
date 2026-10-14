# Security, Privacy & Secret Redaction Policy

## 1. Webhook Authentication & Verification

- Every incoming Shopify webhook is cryptographically checked using HMAC-SHA256.
- Comparison uses `crypto.timingSafeEqual` on byte buffers to prevent timing side-channel attacks.
- Untrusted payloads are rejected prior to JSON parsing or database insertion.

---

## 2. PII & Secret Redaction

The middleware includes a dedicated redaction engine (`src/lib/redact.ts`):
- All passwords, API secrets, tokens, and authorization headers are scrubbed from application logs and audit records.
- Customer emails are partially masked (`b***e@example.com`).
- Phone numbers are partially masked (`******3210`).
- Payment card data (PAN, CVV) is never accepted, processed, or persisted.

---

## 3. Serverless Database Security

- Database communication utilizes TLS (`sslmode=require`).
- Uses parameterized queries via Prisma ORM to eliminate SQL injection vulnerabilities.
- API endpoints for admin metrics and logs require valid session or API credentials.
- Vercel Cron endpoints are protected by `CRON_SECRET` bearer tokens.
