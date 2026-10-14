# Troubleshooting Guide

## Common Issues & Resolutions

### 1. Webhook Rejected with HTTP 401
- **Cause**: Mismatched or missing `SHOPIFY_WEBHOOK_SECRET`.
- **Fix**: Check Shopify Admin → **Settings** → **Notifications** → **Webhooks**. Copy the exact secret at the bottom of the page and set it in `SHOPIFY_WEBHOOK_SECRET`.

### 2. Order Marked as `NEEDS_MAPPING`
- **Cause**: A customer ordered a product whose Shopify Variant ID or SKU is not linked to any Petpooja Menu Item ID.
- **Fix**: Go to the **Product Mapping** page (`/mapping`), click **+ Add Mapping**, enter the Shopify Variant ID and Petpooja Item ID, then click **Retry** on the order in the Orders page.

### 3. Order Marked as `NEEDS_REVIEW`
- **Cause**: The sum of line items, discounts, shipping, and taxes differs by more than 0.05 from Shopify's reported total.
- **Fix**: Review the order financial breakdown in the **Orders** inspection modal. Verify if special tax rules or custom line items apply.

### 4. Petpooja Returns `success: "0"`
- **Cause**:
  - `Invalid app_key or access_token`: Check Petpooja credentials on the **Connections** page.
  - `Store is closed`: Ensure store availability in Petpooja POS is set to Online.
  - `Item out of stock`: Petpooja POS has marked one of the items unavailable.
- **Fix**: Check the error message in the **Failed & Review** tab, resolve the POS condition, and click **Retry Sync**.
