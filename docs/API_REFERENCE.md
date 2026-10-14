# API Reference Specification

Base Live URL: `https://petpooja-middleware1.vercel.app`

## Webhook & POS Endpoints

### 1. `POST /api/webhooks/shopify`
- **Description**: Shopify order event ingestion endpoint. Directly maps and relays the order to Petpooja POS.
- **Full URL**: `https://petpooja-middleware1.vercel.app/api/webhooks/shopify`
- **Headers**:
  - `X-Shopify-Hmac-Sha256`: Base64 HMAC-SHA256 signature
  - `X-Shopify-Topic`: `orders/create`, `orders/updated`, `orders/cancelled`
  - `X-Shopify-Webhook-Id`: Delivery GUID
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Order directly synced and relayed to Petpooja POS", "petpoojaOrderId": "...", "clientOrderID": "..."}`
  - `401 Unauthorized`: Invalid HMAC signature
  - `400 Bad Request`: Missing headers or malformed payload
  - `502 Bad Gateway`: Petpooja API error

---

### 2. `POST /api/petpooja/order-callback`
- **Description**: Receives order status updates from Petpooja POS.
- **Full URL**: `https://petpooja-middleware1.vercel.app/api/petpooja/order-callback`
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
- **Full URL**: `https://petpooja-middleware1.vercel.app/api/petpooja/menu-push`
- **Responses**:
  - `200 OK`: `{"success": "1", "message": "Menu received successfully"}`

---

### 4. `POST /api/petpooja/get-status` & `/api/petpooja/update-status`
- **Description**: Store availability status check and toggle.
- **Full URLs**:
  - `https://petpooja-middleware1.vercel.app/api/petpooja/get-status`
  - `https://petpooja-middleware1.vercel.app/api/petpooja/update-status`

---

### 5. `POST /api/petpooja/item-on` & `/api/petpooja/item-off`
- **Description**: Item availability stock toggle endpoints.
- **Full URLs**:
  - `https://petpooja-middleware1.vercel.app/api/petpooja/item-on`
  - `https://petpooja-middleware1.vercel.app/api/petpooja/item-off`
