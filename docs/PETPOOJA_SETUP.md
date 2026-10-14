# Petpooja POS Integration Guide

Official Documentation Reference: [Petpooja Online Ordering APIs V2.1.0 (Apiary)](https://onlineorderingapisv210.docs.apiary.io/)  
Petpooja Official Website: [https://www.petpooja.com/](https://www.petpooja.com/)  
Developer Portal: `https://developerapi.petpooja.com/developers/configuration/`

---

## 1. Overview & Architecture

Petpooja Online Ordering API (V2.1.0) is an AWS API Gateway-backed integration designed to allow partner ordering platforms and aggregators to:
1. Push live customer orders directly into the kitchen display / cashier POS (`save_order`).
2. Sync restaurant menu items, categories, variants, and addons (`mapped_restaurant_menus` & `menu-push`).
3. Receive real-time order acceptance, rejection, food preparation, and dispatch status updates (`callback_url`).
4. Toggle store availability and item stock in real time.

---

## 2. API Credentials & Authentication

Petpooja authenticates API requests via a 3-part credential set issued per developer/restaurant account:
- **App Key** (`app_key` / `app-key`): Unique developer application identifier.
- **App Secret** (`app_secret` / `app-secret`): Cryptographic private secret.
- **Access Token** (`access_token` / `access-token`): Integration bearer token.
- **Restaurant ID** (`restID`): Identifier of the mapped restaurant outlet in Petpooja POS.

### Staging Sandbox Credentials (from Developer Portal):
```env
PETPOOJA_ENV="staging"
PETPOOJA_APP_KEY="rps3igv8ucfhydx01ao6k9ebnz75tqw4"
PETPOOJA_APP_SECRET="71b70724b84d8d8ea06fe9cc0da105b07c412228"
PETPOOJA_ACCESS_TOKEN="7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1"
PETPOOJA_REST_ID="SAMPLE_REST_101"
```

---

## 3. Petpooja Developer Portal Configuration

Navigate to `https://developerapi.petpooja.com/developers/configuration/` and configure the following parameters:

| Field in Petpooja Portal | Value | Description |
| :--- | :--- | :--- |
| **Base URL** | `https://petpooja-middleware1.vercel.app` | Your live Vercel deployment domain |
| **Type** | `[x] Menu Push` | Petpooja pushes catalog changes automatically |
| **Menu Sharing Endpoint** | `/api/petpooja/menu-push` | Receives menu catalog updates |
| **Get Store Status API Endpoint** | `/api/petpooja/get-status` | Petpooja polls current store online state |
| **Update Store Status API Endpoint** | `/api/petpooja/update-status` | POS toggles store availability |
| **Item Off API Endpoint** | `/api/petpooja/item-off` | Out-of-stock toggle callback |
| **Item On API Endpoint** | `/api/petpooja/item-on` | Back-in-stock toggle callback |
| **Enable Order Relay** | `[x] Checked` | Enables automatic relay to POS terminals |
| **Support addon on/off ?** | `[x] Checked` | Enables modifier level inventory |

---

## 4. Endpoints & Operations Implemented

### 4.1 Order Push: `/save_order`
- **Method**: `POST`
- **Production URL**: `https://47pfzh5sf2.execute-api.ap-southeast-1.amazonaws.com/V1/save_order`
- **Authentication**: Sent in JSON body: `app_key`, `app_secret`, `access_token`.
- **Key Payload Structures**:
  - `OrderInfo.Restaurant.details`: `restID`
  - `OrderInfo.Customer.details`: `name`, `email`, `phone`, `address`, `latitude`, `longitude`
  - `OrderInfo.Order.details`: `orderID`, `payment_type` (`COD` | `Prepaid`), `total`, `discount_total`, `tax_total`, `delivery_charges`, `packing_charges`, `order_type`, `callback_url`, `created_on`
  - `OrderInfo.OrderItem.details`: Array of items with `id` (Petpooja Item ID), `name`, `price`, `final_price`, `quantity`, `variation_id`, `gst_liability`
- **Response Format**:
  ```json
  {
    "success": "1",
    "message": "Order saved successfully",
    "restID": "SAMPLE_REST_101",
    "clientOrderID": "1001",
    "orderID": "PETPOOJA_POS_987654"
  }
  ```

### 4.2 Order Status Callback: `/api/petpooja/order-callback`
When POS staff clicks **Accept**, **Reject**, or **Food Ready**, Petpooja automatically POSTs to the `callback_url` specified during order creation:
```json
{
  "restID": "SAMPLE_REST_101",
  "orderID": "1001",
  "status": "Accept",
  "cancel_reason": ""
}
```
The middleware updates the order status in real time and records it in the audit trail.
