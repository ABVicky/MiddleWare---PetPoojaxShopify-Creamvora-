# Architecture & Integration Specification

## 1. System Overview

The middleware orchestrates end-to-end real-time synchronization between an authorized Shopify store and Petpooja Restaurant POS. It runs serverlessly on **Vercel** as a stateless microservice without external database dependencies.

```
[Shopify Order Event]
       │
       ▼ (HTTPS POST to /api/webhooks/shopify)
[Vercel Serverless Function]
       │
       ├─► [1. Timing-Safe HMAC-SHA256 Verification]
       │
       ├─► [2. Billing Calculator (Decimal.js arithmetic)]
       │      └─► Reconciles line items, discounts, shipping, and taxes
       │
       ├─► [3. Automatic Item & Customer Mapping]
       │      └─► Formats line items, SKU, variant, quantities, and delivery address
       │
       ▼
[Petpooja Online Ordering API Adapter (V2.1.0)]
       │
       ├─► [POST https://pponlineordercb.petpooja.com/save_order]
       ├─► [POST https://pponlineordercb.petpooja.com/update_order_status (on cancel)]
       ├─► [Response Validation: success === "1", extract POS orderID]
       │
       ▼
[Petpooja POS Terminal / KDS Screen] ──► Instant Order Appearance!
       │
       ▼
[Petpooja Callback Receiver (/api/petpooja/order-callback)]
       └─► Receives POS Status Changes: Accept / Reject / Food Ready / Dispatched
```

---

## 2. Direct Sync Pipeline

1. **Ingestion**: Shopify webhook triggers `https://petpooja-middleware1.vercel.app/api/webhooks/shopify`.
2. **Verification**: Validates cryptographic signature using `SHOPIFY_WEBHOOK_SECRET`.
3. **Payload Construction**: Normalizes lines, SKU, variants, discounts, delivery address, and payment method (COD vs Prepaid).
4. **Direct Relay**: Invokes Petpooja's `/save_order` endpoint directly.
5. **Acknowledgment**: Returns the Petpooja POS order ID to Shopify.
