# Shopify Webhook Setup Guide (No App Required)

This integration connects your Shopify store to Petpooja POS **strictly through standard Shopify HTTP webhooks**. You do not need to build a custom private app, install OAuth apps, or grant store access tokens.

---

## 1. Webhook Target Endpoint

Your middleware exposes an HMAC-verified, serverless-optimized webhook receiver:
```
https://<YOUR-VERCEL-DOMAIN>/api/webhooks/shopify
```
Example: `https://petpooja-middleware.vercel.app/api/webhooks/shopify`

---

## 2. Step-by-Step Configuration in Shopify Admin

1. Log into your **Shopify Store Admin** (`https://admin.shopify.com/store/<your-store-name>`).
2. Go to **Settings** (bottom left corner) → **Notifications**.
3. Scroll down to the **Webhooks** section at the bottom of the page.
4. Click **Create webhook**.

### Register the following 3 Webhook Subscriptions:

#### A. Order Creation
- **Event**: `Order creation` (`orders/create`)
- **Format**: `JSON`
- **URL**: `https://<YOUR-VERCEL-DOMAIN>/api/webhooks/shopify`
- **Webhook API version**: `Latest (2024-04 or later)`
- Click **Save**.

#### B. Order Update
- **Event**: `Order updated` (`orders/updated`)
- **Format**: `JSON`
- **URL**: `https://<YOUR-VERCEL-DOMAIN>/api/webhooks/shopify`
- **Webhook API version**: `Latest (2024-04 or later)`
- Click **Save**.

#### C. Order Cancellation
- **Event**: `Order cancellation` (`orders/cancelled`)
- **Format**: `JSON`
- **URL**: `https://<YOUR-VERCEL-DOMAIN>/api/webhooks/shopify`
- **Webhook API version**: `Latest (2024-04 or later)`
- Click **Save**.

---

## 3. Obtaining the Webhook Signing Secret

At the bottom of the Shopify **Webhooks** section, you will see a banner that says:
> *"All your webhooks will be signed with `your_webhook_signing_secret` so you can verify their integrity."*

1. Copy that signing secret.
2. In your Vercel Project Settings (or in `.env` for local testing), set:
   ```env
   SHOPIFY_WEBHOOK_SECRET="your_copied_secret_string"
   SHOPIFY_SHOP_DOMAIN="your-store.myshopify.com"
   ```
3. Or paste it directly into your middleware dashboard at `/connections` under **Shopify Webhooks Connection**.

---

## 4. How Webhook Verification & Deduplication Works

1. **HMAC-SHA256 Verification**:
   Shopify includes the header `X-Shopify-Hmac-Sha256`. The middleware computes a SHA-256 HMAC of the raw request payload buffer using your `SHOPIFY_WEBHOOK_SECRET` and performs a constant-time equality check (`crypto.timingSafeEqual`). If the signature doesn't match, the request is immediately rejected with HTTP 401.

2. **Deduplication (Replay Protection)**:
   Shopify sends an `X-Shopify-Webhook-Id` header with every event delivery. If network glitches cause Shopify to retry an identical delivery, the middleware looks up the delivery ID in the `webhook_events` table and responds with HTTP 200 immediately without creating duplicate POS orders or jobs.

3. **Asynchronous Durability**:
   The webhook returns HTTP 200 within ~50ms after persisting the order in PostgreSQL. The Petpooja POS API call is performed asynchronously in the background.
