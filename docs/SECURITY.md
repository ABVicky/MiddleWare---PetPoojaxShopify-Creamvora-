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

## 3. Stateless Architecture & PCI-DSS Compliance

- **Zero Persistence**: The middleware is completely stateless; no order data, customer credit cards, or personal information is stored on external disks or databases.
- **Direct Memory Relay**: Orders pass directly from Shopify's encrypted webhook to Petpooja's HTTPS `/save_order` API in volatile memory and are immediately disposed of upon response.
- **Transport Layer Security**: All communications with Shopify, Vercel, and Petpooja enforce modern TLS 1.3 encryption.
