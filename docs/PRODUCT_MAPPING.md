# Product & Menu Mapping Guide

## 1. Why Mapping is Required

Shopify products use numeric Variant IDs (e.g. `456789123`) and merchant-defined SKUs (e.g. `PIZZA-MARG-REG`), whereas Petpooja POS identifies items using alphanumeric Item IDs (e.g. `ITEM_PIZZA_MARGHERITA`) and optional Variation IDs (e.g. `VAR_10_INCH`).

To prevent kitchen miscommunication and cashier errors, **every Shopify order item must resolve to a valid Petpooja menu item**.

---

## 2. Unmapped Item Safety Policy

The middleware enforces a strict zero-silent-substitution policy:
1. When an order contains an unmapped product, the order is **never partially submitted** or guessed.
2. The order state transitions to **`NEEDS_MAPPING`**.
3. An actionable notification is displayed on the dashboard highlighting the exact missing product title, variant ID, and SKU.
4. Once the operator adds the mapping via `/mapping`, clicking **Retry** on the order pushes it to Petpooja immediately.

---

## 3. CSV Import & Export Format

You can import product mappings in bulk via CSV. The CSV format is:

```csv
shopifyVariantId,shopifySku,shopifyTitle,petpoojaItemId,petpoojaItemName,petpoojaVariationId
12345678,PIZZA-MARG-REG,Margherita Pizza,ITEM_PIZZA_MARGHERITA,Margherita Pizza,
12345679,SIDES-GARLIC-BRD,Cheesy Garlic Bread,ITEM_GARLIC_BREAD,Cheesy Garlic Bread,
```
