# Architecture & Integration Specification

## 1. System Overview

The middleware orchestrates end-to-end synchronization between an authorized Shopify store and Petpooja Restaurant POS. It is designed to run serverlessly on Vercel backed by PostgreSQL with zero permanent in-memory worker requirements.

```
[Shopify Order Event]
       │
       ▼ (HTTPS POST with X-Shopify-Hmac-Sha256)
[/api/webhooks/shopify]
       │
       ├─► [1. Timing-Safe HMAC-SHA256 Verification]
       ├─► [2. Deduplication via X-Shopify-Webhook-Id]
       ├─► [3. Transactional Outbox Persistence (shopify_orders + sync_jobs)]
       ▼
[Immediate Asynchronous Dispatch + Vercel Cron Recovery (/api/cron/process-queue)]
       │
       ├─► [4. Product Mapping Engine (Variant/SKU -> Petpooja Item ID)]
       │      └─► If unmapped: Status = NEEDS_MAPPING (Actionable Alert)
       │
       ├─► [5. Billing Calculator (Decimal.js arithmetic)]
       │      └─► If total mismatch > 0.05: Status = NEEDS_REVIEW
       │
       ▼
[Petpooja Online Ordering API Adapter (V2.1.0)]
       │
       ├─► [POST https://47pfzh5sf2.execute-api.ap-southeast-1.amazonaws.com/V1/save_order]
       ├─► [Response Validation: success === "1", extract POS orderID]
       │
       ▼
[Database Persistence] ──► Status: SYNCED
       │
       ▼
[Petpooja Callback Receiver (/api/petpooja/order-callback)]
       └─► Receives POS Status Changes: Accept / Reject / Food Ready / Dispatched
```

---

## 2. State Machine

Orders progress through explicit, auditable states:

1. `RECEIVED`: Webhook verified and stored in database.
2. `VALIDATING`: Resolving product catalog mappings and calculating billing sums.
3. `QUEUED`: Awaiting Petpooja API invocation.
4. `PROCESSING`: Order locked by dispatcher.
5. `SYNCED`: Accepted by Petpooja POS with valid `orderID` returned.
6. `NEEDS_MAPPING`: Order contains unmapped products. Requires operator to map SKU/variant.
7. `NEEDS_REVIEW`: Financial total mismatch detected. Held for operator approval.
8. `RETRY_PENDING`: Transient Petpooja API failure (network error, rate limit, HTTP 5xx). Scheduled with exponential backoff.
9. `FAILED`: Non-retryable error (invalid credentials, business rule rejection) or maximum retry attempts exceeded.
10. `CANCELLED`: Order cancelled by merchant or rejected in POS.

---

## 3. Durability & Recovery Strategy

- **Transactional Outbox**: Orders and jobs are written in PostgreSQL before HTTP response is sent.
- **Vercel Cron Recovery**: `/api/cron/process-queue` executes periodically to pick up any pending retries or orders interrupted during serverless cold starts.
- **Hourly Reconciliation**: `/api/cron/reconcile` audits orders from the last 24 hours, recovers stuck `PROCESSING` states, and flags discrepancies.
