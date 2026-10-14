# Testing & Quality Assurance Guide

## 1. Running the Automated Test Suite

The project includes unit and integration tests powered by Vitest:

```bash
# Run all tests once
npm test

# Run tests in watch mode during development
npm run test:watch
```

---

## 2. Test Coverage Summary

- **`tests/webhook-verification.test.ts`**: Verifies valid Shopify HMAC signatures, detects tampering, handles missing headers, and validates timing-safe equality.
- **`tests/billing-calculator.test.ts`**: Verifies `decimal.js` arithmetic precision, subtotal calculations, effective discounts, COD detection, and total mismatch detection.
- **`tests/petpooja-mapper.test.ts`**: Validates transformation of Shopify webhooks into the exact Petpooja V2.1.0 `save_order` JSON structure.
- **`tests/petpooja-client.test.ts`**: Validates Mock mode responses and classified error codes (`AUTH_ERROR`, `STORE_CLOSED`, `RATE_LIMITED`).
- **`tests/redaction.test.ts`**: Validates scrubbing of passwords, tokens, API keys, and masking of emails and phone numbers.

---

## 3. Interactive Browser Simulator

You can test without live credentials by visiting `/simulator`:
1. Choose from prebuilt scenarios:
   - **Standard Paid Order**
   - **Cash On Delivery (COD)**
   - **Order with Discount**
   - **Unmapped Product (triggers NEEDS_MAPPING)**
2. Click **Inspect Transformation (Dry Run)** to see the exact payload sent to Petpooja.
3. Click **Ingest Simulated Webhook** to test the live pipeline.
