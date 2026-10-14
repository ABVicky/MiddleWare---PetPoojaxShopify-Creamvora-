# GitHub and Vercel Deployment Guide

This guide walks you through deploying the direct Shopify ➔ Petpooja POS integration to **Vercel** via **GitHub**.

---

## 1. Repository Details

- **GitHub Repository**: [https://github.com/ABVicky/MiddleWare---PetPoojaxShopify-Creamvora-.git](https://github.com/ABVicky/MiddleWare---PetPoojaxShopify-Creamvora-.git)
- **Production URL**: `https://petpooja-middleware1.vercel.app`

---

## 2. Deploy to Vercel (Zero Database Required)

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import the repository: `ABVicky/MiddleWare---PetPoojaxShopify-Creamvora-`.
4. Leave the Framework Preset as **Next.js**.
5. Under **Environment Variables**, add:

| Key | Example / Default Value | Description |
| :--- | :--- | :--- |
| `APP_URL` | `https://petpooja-middleware1.vercel.app` | Production app domain |
| `PETPOOJA_ENV` | `staging` (or `production`) | Petpooja environment |
| `PETPOOJA_APP_KEY` | `rps3igv8ucfhydx01ao6k9ebnz75tqw4` | Petpooja App Key |
| `PETPOOJA_APP_SECRET` | `71b70724b84d8d8ea06fe9cc0da105b07c412228` | Petpooja App Secret |
| `PETPOOJA_ACCESS_TOKEN` | `7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1` | Petpooja Access Token |
| `PETPOOJA_REST_ID` | `SAMPLE_REST_101` | Your Petpooja Restaurant Outlet ID |
| `SHOPIFY_WEBHOOK_SECRET` | `your_webhook_signing_secret` | (Optional) HMAC secret from Shopify |

6. Click **Deploy**.

---

## 3. Webhook Endpoints Active in Vercel

Once deployed, your endpoints are immediately active:
- **Shopify Webhook Target**: `https://petpooja-middleware1.vercel.app/api/webhooks/shopify`
- **Petpooja Status Callback**: `https://petpooja-middleware1.vercel.app/api/petpooja/order-callback`
- **Petpooja Menu Sharing**: `https://petpooja-middleware1.vercel.app/api/petpooja/menu-push`
- **Petpooja Store Status Check**: `https://petpooja-middleware1.vercel.app/api/petpooja/get-status`
- **Petpooja Store Status Update**: `https://petpooja-middleware1.vercel.app/api/petpooja/update-status`
- **Petpooja Item Stock Toggles**: `https://petpooja-middleware1.vercel.app/api/petpooja/item-on` & `item-off`
