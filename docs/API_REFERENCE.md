# API Reference Specification

## Webhook & POS Endpoints

### 1. `POST /api/webhooks/shopify`
- **Description**: Shopify order event ingestion endpoint.
- **Headers**:
  - `X-Shopify-Hmac-Sha256`: Base64 HMAC-SHA256 signature
  - `X-Shopify-Topic`: `orders/create`, `orders/updated`, `orders/cancelled`
  - `X-Shopify-Shop-Domain`: Store domain
  - `X-Shopify-Webhook-Id`: Delivery GUID for deduplication
- **Responses**:
  - `200 OK`: Accepted and queued
  - `401 Unauthorized`: Invalid HMAC signature
  - `400 Bad Request`: Missing headers or malformed payload

---

### 2. `POST /api/petpooja/order-callback`
- **Description**: Receives order status updates from Petpooja POS.
- **Body**:
  ```json
  {
    "restID": "string",
    "orderID": "string",
    "status": "Accept | Reject | Food Ready | Dispatched | Cancelled",
    "cancel_reason": "string (optional)"
  }
  ```
- **Responses**:
  - `200 OK`: `{"success": "1", "message": "Callback processed successfully"}`

---

### 3. `POST /api/petpooja/menu-push`
- **Description**: Receives catalog updates pushed from Petpooja POS.
- **Responses**:
  - `200 OK`: `{"success": "1", "message": "Menu received and processed successfully"}`

---

### 4. `POST /api/petpooja/get-status` & `/api/petpooja/update-status`
- **Description**: Store availability status check and toggle.

---

### 5. `GET /api/cron/process-queue`
- **Description**: Triggered by Vercel Cron (`*/5 * * * *`) to process pending outbox jobs and retries.
- **Headers**: `Authorization: Bearer <CRON_SECRET>`

---

### 6. `GET /api/cron/reconcile`
- **Description**: Triggered by Vercel Cron (`0 * * * *`) for hourly order reconciliation audits.
- **Headers**: `Authorization: Bearer <CRON_SECRET>`
