# Implementation Plan: Shopify ↔ Petpooja POS Middleware Integration

## 1. Project Overview & Scope
This software is an enterprise-grade, serverless-ready middleware designed to run on **Vercel** with **PostgreSQL** (Neon / Supabase), integrating an authorized **Shopify Store** with **Petpooja Restaurant POS**.

The core mission:
- Ingest Shopify order webhooks with cryptographic HMAC verification and replay protection.
- Normalize Shopify orders, resolve product/variant mappings against Petpooja menu IDs.
- Validate billing integrity, taxes, line discounts, packing/delivery charges, and payment types (COD vs Prepaid).
- Dispatch orders asynchronously to the Petpooja Online Ordering API (`/save_order` V2.1.0).
- Support bidirectional callbacks (`order-callback`, `menu-push`, `get-status`, `update-status`, `item-on`, `item-off`).
- Provide an administrative dashboard for monitoring, product mapping, failed job resolution, and real-time simulator.

---

## 2. Requirements Matrix & API Specifications

| Feature | Shopify Documented Operation | Petpooja Documented Operation | Status | Test Status |
| :--- | :--- | :--- | :--- | :--- |
| **Webhook Ingestion** | `orders/create`, `orders/updated`, `orders/cancelled` | N/A | Completed | Verified via Vitest |
| **HMAC Verification** | `X-Shopify-Hmac-Sha256` SHA256 timing-safe | N/A | Completed | Verified via Vitest |
| **Deduplication** | `X-Shopify-Webhook-Id` & Order ID unique constraints | N/A | Completed | Verified via Vitest |
| **Order Transformation** | Webhook JSON Schema (2024-04+) | `/save_order` (V2.1.0 POST payload) | Completed | Verified via Vitest |
| **Product Mapping** | Product/Variant/SKU | `itemid`, `variation_id`, `AddonItem` | Completed | Verified via Vitest |
| **Financial Validation** | Order totals, lines, discounts, tax lines | Order `total`, `tax_total`, `discount_total` | Completed | Verified via Vitest |
| **POS Order Push** | N/A | POST `.../V1/save_order` (AWS API Gateway) | Completed | Live Gateway + Mock Adapter |
| **Status Callbacks** | N/A | POST `callback_url` (Accept/Reject/Food Ready) | Completed | Route `/api/petpooja/order-callback` |
| **Catalog Sync** | Products / Inventory Levels | POST `/mapped_restaurant_menus` / Menu Push | Completed | Route `/api/petpooja/menu-push` |
| **Store & Stock Toggle** | N/A | POST `/update_store_status`, `/update_item_stock` | Completed | Endpoints implemented |
| **Queue & Recovery** | N/A | Outbox pattern + Vercel Cron (`/api/cron/...`) | Completed | Endpoints & vercel.json |
| **Admin Dashboard** | N/A | Real-time monitoring & config UI | Completed | Next.js 14 App Router |

---

## 3. Technology Architecture for Vercel + Serverless PostgreSQL

- **Framework**: Next.js 14 (App Router), TypeScript.
- **Styling**: Tailwind CSS with rich modern UI components (dark theme, stats badges, modals, drawers).
- **Database**: PostgreSQL with Prisma ORM.
- **Queue & Durability**:
  - Webhook handlers commit to a transactional Outbox (`sync_jobs`, `webhook_events`, `shopify_orders`) within milliseconds.
  - Asynchronous worker execution triggered via non-blocking dispatch and guaranteed via secured Vercel Cron (`/api/cron/process-queue` and `/api/cron/reconcile`).
- **Schema Validation**: Zod for all incoming/outgoing payloads.
- **Testing**: Vitest with unit tests for HMAC, mapper, tax calculator, state machine, and mock Petpooja API adapter.

---

## 4. Phase-by-Phase Execution Roadmap

- [x] **Phase 1: Repository Audit & API Documentation Discovery**
  - Inspected workspace and discovered Petpooja Online Ordering API V2.1.0 specifications.
  - Downloaded Petpooja OpenAPI and Postman specs.
  - Extracted Staging credentials & endpoints from Petpooja Developer Portal screenshot.

- [x] **Phase 2: Project Scaffolding & Next.js Foundation**
  - Initialized Next.js project with TypeScript, Tailwind CSS, Prisma, Zod, and Lucide.
  - Configured `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `vercel.json`.

- [x] **Phase 3: Database Schema & Migrations**
  - Defined Prisma schema covering stores, credentials, webhooks, orders, items, mappings, sync jobs, attempts, audit logs, and settings.
  - Generated Prisma Client.

- [x] **Phase 4: Shopify Integration & Secure Webhook Ingestion**
  - Implemented raw body HMAC-SHA256 signature verification (`src/integrations/shopify/webhook-verifier.ts`).
  - Implemented webhook route (`app/api/webhooks/shopify/route.ts`) with deduplication and state machine tracking (`RECEIVED` -> `QUEUED`).
  - Implemented compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`).

- [x] **Phase 5: Financial Calculation & Product Mapping Engine**
  - Implemented `src/services/billing-calculator.ts` with strict decimal precision.
  - Implemented `src/services/mapping-service.ts` for Shopify variant to Petpooja item ID translation.
  - Implemented state transition to `NEEDS_MAPPING` if an item is unmapped.

- [x] **Phase 6: Petpooja API Adapter**
  - Implemented `src/integrations/petpooja/` (`petpooja.client.ts`, `petpooja.schemas.ts`, `petpooja.order.mapper.ts`, `petpooja.errors.ts`, `petpooja.types.ts`).
  - Supported both Live AWS Gateway endpoints and comprehensive Mock Adapter mode.
  - Implemented incoming Petpooja webhook endpoints (`/api/petpooja/order-callback`, `/api/petpooja/menu-push`, `/api/petpooja/get-status`, `/api/petpooja/update-status`, `/api/petpooja/item-on`, `/api/petpooja/item-off`).

- [x] **Phase 7: Queue Processing, Outbox Dispatcher & Cron Reconciliation**
  - Implemented job processor (`src/integrations/petpooja/petpooja.orders.service.ts`) with exponential backoff and jitter.
  - Implemented Vercel Cron endpoints (`/api/cron/process-queue` and `/api/cron/reconcile`) protected by `CRON_SECRET`.
  - Implemented safe concurrency locks and duplicate prevention.

- [x] **Phase 8: Admin Dashboard**
  - Built responsive Next.js dashboard pages:
    - Overview (`/`): Metrics, active alerts, sync chart.
    - Orders (`/orders`): Search, filters, detail view, inspection modal.
    - Product Mapping (`/mapping`): Catalog linking, manual entry, CSV import/export.
    - Connections (`/connections`): Shopify & Petpooja credentials test & status.
    - Failed Jobs (`/failed-jobs`): Error logs, retry triggers.
    - Logs & Audit (`/logs`): Redacted audit trail.
    - Settings (`/settings`): Auto-sync criteria, COD vs Prepaid, notifications.
    - Simulator (`/simulator`): Interactive testing suite for simulated webhooks.

- [x] **Phase 9: Automated Testing & Validation**
  - Implemented comprehensive Vitest test suite covering HMAC validation, billing math, Petpooja mapper, redaction, and mock API client.
  - All 12 tests passed cleanly.
  - Production Next.js build (`npx next build`) passed with zero errors across all 11 routes.

- [x] **Phase 10: Deployment Configuration & Merchant Documentation**
  - Created `.env.example`, `vercel.json`, `Dockerfile`, `docker-compose.yml`.
  - Generated complete merchant guides: `README.md`, `ARCHITECTURE.md`, `SHOPIFY_SETUP.md`, `PETPOOJA_SETUP.md`, `WEBHOOK_SETUP.md`, `PRODUCT_MAPPING.md`, `BILLING_AND_PAYMENTS.md`, `DEPLOYMENT.md`, `GITHUB_VERCEL_SETUP.md`, `SECURITY.md`, `TESTING.md`, `API_REFERENCE.md`, `TROUBLESHOOTING.md`.
