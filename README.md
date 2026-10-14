# Shopify ➔ Petpooja Direct POS Sync

A stateless, real-time middleware connecting your **Shopify Store** directly to **Petpooja Restaurant POS**, hosted exclusively on **Vercel** and maintained in **GitHub**.

**Only 4 tools/technologies used:**
1. **Shopify**: Store & HTTP Order Webhook
2. **Petpooja**: Online Ordering API (V2.1.0)
3. **GitHub**: Repository hosting the code
4. **Vercel**: Serverless execution (zero databases or external queues required)

---

## ⚡ How It Works

1. Customer places an order on Shopify.
2. Shopify immediately sends a webhook to `https://<YOUR-VERCEL-DOMAIN>/api/webhooks/shopify`.
3. The middleware verifies the HMAC signature, formats items, customer delivery details, payment type (Prepaid vs COD), and taxes.
4. The middleware calls Petpooja's `/save_order` API directly.
5. The order appears on your Petpooja POS screen / Kitchen Display (KDS) within seconds!

---

## 🚀 Setup Guide

### 1. Deploy to Vercel
1. Go to [Vercel](https://vercel.com) and import `ABVicky/MiddleWare---PetPoojaxShopify-Creamvora-`.
2. In **Environment Variables**, add:
   - `PETPOOJA_ENV`: `staging` *(or `production`)*
   - `PETPOOJA_APP_KEY`: `rps3igv8ucfhydx01ao6k9ebnz75tqw4`
   - `PETPOOJA_APP_SECRET`: `71b70724b84d8d8ea06fe9cc0da105b07c412228`
   - `PETPOOJA_ACCESS_TOKEN`: `7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1`
   - `PETPOOJA_REST_ID`: Your Restaurant Outlet ID in Petpooja (e.g. `SAMPLE_REST_101`)
   - `SHOPIFY_WEBHOOK_SECRET`: *(Optional for HMAC check)*
3. Click **Deploy**.

### 2. Configure Shopify Webhook
In your **Shopify Admin** ➔ **Settings** ➔ **Notifications** ➔ **Webhooks**:
- Event: `Order creation`
- Format: `JSON`
- URL: `https://<YOUR-VERCEL-DOMAIN>/api/webhooks/shopify`

### 3. Configure Petpooja Developer Portal
In `developerapi.petpooja.com/developers/configuration/`:
- **Base URL**: `https://<YOUR-VERCEL-DOMAIN>`
- **Menu Sharing Endpoint**: `/api/petpooja/menu-push`
- **Get Store Status API**: `/api/petpooja/get-status`
- **Update Store Status API**: `/api/petpooja/update-status`
- **Item Off API**: `/api/petpooja/item-off`
- **Item On API**: `/api/petpooja/item-on`
- Enable **Order Relay** ✅
