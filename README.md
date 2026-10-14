# Shopify ↔ Petpooja POS Integration Middleware

A production-grade, serverless middleware connecting a **Shopify Store** to **Petpooja Restaurant POS**. Built for deployment on **Vercel** with **PostgreSQL** (Neon / Supabase) and **GitHub**.

---

## 🚀 Key Features

- **Shopify Webhook Ingestion**: Receives `orders/create`, `orders/updated`, and `orders/cancelled` with cryptographic `X-Shopify-Hmac-Sha256` verification and deduplication. No custom Shopify app installation required.
- **Official Petpooja V2.1.0 Support**: Implements the official [Petpooja Online Ordering API](https://onlineorderingapisv210.docs.apiary.io/) (`/save_order` on AWS API Gateway).
- **Zero Silent Substitution**: Detects unmapped items and safely transitions orders to `NEEDS_MAPPING` with actionable resolution tools.
- **Financial & Decimal Integrity**: Employs `decimal.js` for tax, discount, shipping, and COD vs Prepaid payment classification. Mismatched sums are flagged as `NEEDS_REVIEW`.
- **Bidirectional Petpooja Callbacks**: Handles POS order status callbacks (`order-callback`), menu push (`menu-push`), store availability (`get-status`, `update-status`), and stock toggles (`item-on`, `item-off`).
- **Durable Serverless Architecture**: Transactional outbox with Vercel Cron recovery (`/api/cron/process-queue` and `/api/cron/reconcile`) and exponential backoff retry.
- **Modern Management Dashboard**: Next.js App Router with Tailwind CSS, KPI cards, order inspector, product mapping manager with CSV import/export, and live test simulator.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Database**: PostgreSQL with Prisma ORM
- **Durability**: Transactional Outbox + Vercel Cron Workers
- **Financial Math**: Decimal.js
- **Testing**: Vitest (Unit & Integration tests)
- **Deployment**: Vercel + GitHub + Docker

---

## 📋 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update with your PostgreSQL database URL, Shopify Webhook Secret, and Petpooja credentials.

### 3. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Automated Tests
```bash
npm test
```

---

## 📖 Documentation Index

- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Petpooja POS Setup](docs/PETPOOJA_SETUP.md)
- [Shopify Webhooks Setup](docs/SHOPIFY_SETUP.md)
- [GitHub & Vercel Deployment](docs/GITHUB_VERCEL_SETUP.md)
- [Architecture & State Machine](docs/ARCHITECTURE.md)
- [Financial Integrity & Taxes](docs/BILLING_AND_PAYMENTS.md)
- [Product Mapping Guide](docs/PRODUCT_MAPPING.md)
- [API Reference](docs/API_REFERENCE.md)
- [Security & Redaction](docs/SECURITY.md)
- [Testing Guide](docs/TESTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
