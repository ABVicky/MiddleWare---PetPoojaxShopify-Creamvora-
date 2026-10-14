# GitHub and Vercel Deployment Guide

This guide walks you through deploying the Shopify ↔ Petpooja POS Middleware to **Vercel** with **Neon / Supabase PostgreSQL** and **GitHub CI/CD**.

---

## 1. Create the GitHub Repository

1. Initialize git locally (if not already initialized):
   ```bash
   git init
   git add .
   git commit -m "feat: complete shopify petpooja pos middleware"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g. `shopify-petpooja-middleware`).
3. Link and push your code:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/shopify-petpooja-middleware.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Provision a Serverless PostgreSQL Database

Create a free serverless PostgreSQL instance on **Neon** (`https://neon.tech`) or **Supabase** (`https://supabase.com`):
1. Create a new project in the region closest to your restaurant/store (e.g., Singapore `ap-southeast-1` or Mumbai `ap-south-1`).
2. Copy the **Pooled Connection String** (`DATABASE_URL`) with `?sslmode=require&pgbouncer=true`.
3. Copy the **Direct Connection String** (`DIRECT_URL`).

---

## 3. Deploy to Vercel

1. Log into [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import the `shopify-petpooja-middleware` GitHub repository.
4. Keep the Framework Preset as **Next.js**.
5. In **Environment Variables**, add the following required keys:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:pass@ep-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` | Pooled DB URL |
| `DIRECT_URL` | `postgresql://user:pass@ep.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` | Direct DB URL for migrations |
| `APP_URL` | `https://your-app-name.vercel.app` | Production app domain |
| `CRON_SECRET` | `<32-char-random-string>` | Protects Vercel cron endpoints |
| `SHOPIFY_SHOP_DOMAIN` | `your-store.myshopify.com` | Shopify domain |
| `SHOPIFY_WEBHOOK_SECRET`| `your_shopify_webhook_secret` | Shopify webhook signature key |
| `PETPOOJA_ENV` | `staging` (or `production`) | Petpooja environment |
| `PETPOOJA_APP_KEY` | `rps3igv8ucfhydx01ao6k9ebnz75tqw4` | Petpooja App Key |
| `PETPOOJA_APP_SECRET` | `71b70724b84d8d8ea06fe9cc0da105b07c412228` | Petpooja App Secret |
| `PETPOOJA_ACCESS_TOKEN` | `7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1` | Petpooja Access Token |
| `PETPOOJA_REST_ID` | `SAMPLE_REST_101` | Mapped Restaurant ID |

6. Click **Deploy**.
7. Run the initial database push once deployed:
   ```bash
   npx prisma db push
   ```

---

## 4. Vercel Cron Configuration

The `vercel.json` included in the repository automatically registers:
- `*/5 * * * *` → `/api/cron/process-queue` (recovers pending retries and outbox jobs)
- `0 * * * *` → `/api/cron/reconcile` (hourly reconciliation audit)

These endpoints verify `Authorization: Bearer <CRON_SECRET>` automatically supplied by Vercel Cron.
