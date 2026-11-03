# Cake & Product Mapping Guide

## 1. Why Mapping is Required

Shopify products use numeric Variant IDs (e.g. `45123456789012`), Product IDs (e.g. `8209829119461`), and merchant-defined SKUs (e.g. `CAKE-CHOC-500`), whereas Petpooja POS identifies items using alphanumeric Item IDs (e.g. `PP_CAKE_CHOC_500`) and optional Variation IDs (e.g. `VAR_500G`).

To ensure that each cake ordered on Shopify appears accurately on the physical Petpooja POS terminal and Kitchen Display Ticket (KDT), **each cake is mapped with its Petpooja Item ID parallel to the Shopify ID**.

---

## 2. Parallel ID Architecture

When a Shopify order is ingested, the middleware resolves each cake using [`src/config/cake-mappings.json`](../src/config/cake-mappings.json):
1. **Petpooja Item ID (`OrderItem.details[].id`)**: Populated with the mapped Petpooja item code (e.g. `PP_CAKE_CHOC_500`).
2. **Petpooja Variation ID (`OrderItem.details[].variation_id`)**: Populated with the weight/variant code (e.g. `VAR_500G`).
3. **Item Name (`OrderItem.details[].name`)**: Populated with the official cake name.
4. **Item Description (`OrderItem.details[].description`)**: Automatically attaches the parallel Shopify identifier:
   ```
   Shopify ID: 45123456789012 | SKU: CAKE-CHOC-500
   ```
   This gives the cashier and kitchen staff complete end-to-end traceability of both the Petpooja Item ID and Shopify ID side by side.

### Matching order

Each line item is matched against **all** mappings one tier at a time, most specific first:

1. `shopifyVariantId`: the exact cake and size (recommended for every sellable variant)
2. `shopifySku`
3. `shopifyProductId`: used only if every mapping for that product points to the same Petpooja item/variation. A cake sold in several sizes needs variant ID or SKU mappings.
4. `shopifyTitle` / `cakeName`: compared to the line title, `"Title - Variant"` or `"Title (Variant)"`

The optional `petpoojaVariationName` field sets `variation_name` exactly as it appears in the Petpooja menu.

### Unmapped products

If a line item matches no mapping, the order is **still sent** to Petpooja (with the Shopify SKU/ID as a placeholder item code), and a `WARN` log is written:

```
UNMAPPED SHOPIFY PRODUCT: no Petpooja item mapping found; line will need manual billing in Petpooja
```

The log includes the order number and the Shopify product ID, variant ID, SKU and title. Add a mapping for that variant to fix it. An invalid `CAKE_MAPPINGS_JSON` value is logged as an `ERROR`, and the middleware falls back to `cake-mappings.json`.

---

## 3. Configuration & Customization

You can define and update cake mappings in two ways:

### Option A: Edit `src/config/cake-mappings.json`
Update the JSON array in [`src/config/cake-mappings.json`](../src/config/cake-mappings.json):

```json
[
  {
    "cakeName": "Belgian Dark Chocolate Truffle Cake (500g)",
    "shopifyVariantId": "45123456789012",
    "shopifyProductId": "8209829119461",
    "shopifySku": "CAKE-CHOC-500",
    "shopifyTitle": "Belgian Dark Chocolate Truffle Cake (500g)",
    "petpoojaItemId": "PP_CAKE_CHOC_500",
    "petpoojaVariationId": "VAR_500G",
    "petpoojaItemName": "Belgian Dark Chocolate Truffle Cake 500g"
  }
]
```

### Option B: Set `CAKE_MAPPINGS_JSON` in Vercel
In your **Vercel Project Dashboard** ➔ **Settings** ➔ **Environment Variables**, you can set `CAKE_MAPPINGS_JSON` to any stringified JSON array matching the structure above. The middleware will automatically use these mappings without needing a code redeploy.

---

## 4. Testing & Verification

You can query the live mappings via the middleware API:
- **Inspect all mappings**:
  - `GET https://<YOUR-VERCEL-DOMAIN>/api/mappings`
  - `GET https://<YOUR-VERCEL-DOMAIN>/api/petpooja/mappings`
- **Test a line item lookup**:
  ```bash
  curl -X POST https://<YOUR-VERCEL-DOMAIN>/api/petpooja/mappings \
    -H "Content-Type: application/json" \
    -d '{"title": "Belgian Dark Chocolate Truffle Cake (500g)", "sku": "CAKE-CHOC-500"}'
  ```

