import defaultCakeMappings from "./cake-mappings.json";

export interface CakeItemMapping {
  cakeName: string;
  shopifyVariantId?: string | number;
  shopifyProductId?: string | number;
  shopifySku?: string;
  shopifyTitle?: string;
  petpoojaItemId: string;
  petpoojaVariationId?: string;
  petpoojaItemName?: string;
}

/**
 * Returns all active cake mappings.
 * Supports dynamic override via process.env.CAKE_MAPPINGS_JSON if set in Vercel.
 */
export function getCakeMappings(): CakeItemMapping[] {
  if (process.env.CAKE_MAPPINGS_JSON) {
    try {
      const parsed = JSON.parse(process.env.CAKE_MAPPINGS_JSON);
      if (Array.isArray(parsed)) {
        return parsed as CakeItemMapping[];
      }
    } catch {
      // Fallback to static mappings if JSON parsing fails
    }
  }

  return defaultCakeMappings as CakeItemMapping[];
}

/**
 * Resolves a Petpooja Item ID parallel to a Shopify line item.
 * Searches by Shopify Variant ID, Product ID, SKU, or Product Title.
 */
export function findCakeMapping(
  line: {
    id: string | number;
    variant_id?: string | number | null;
    product_id?: string | number | null;
    sku?: string | null;
    title: string;
  },
  customMappings?: CakeItemMapping[]
): CakeItemMapping | undefined {
  const mappings = customMappings && customMappings.length > 0 ? customMappings : getCakeMappings();

  const varIdStr = line.variant_id ? String(line.variant_id).trim() : null;
  const prodIdStr = line.product_id ? String(line.product_id).trim() : null;
  const lineIdStr = String(line.id).trim();
  const skuStr = line.sku ? line.sku.trim().toLowerCase() : null;
  const titleStr = line.title ? line.title.trim().toLowerCase() : "";

  return mappings.find((m) => {
    // 1. Match by Shopify Variant ID (or Line Item ID)
    if (m.shopifyVariantId) {
      const mapVarStr = String(m.shopifyVariantId).trim();
      if (mapVarStr === varIdStr || mapVarStr === lineIdStr) return true;
    }

    // 2. Match by Shopify SKU
    if (m.shopifySku && skuStr) {
      if (m.shopifySku.trim().toLowerCase() === skuStr) return true;
    }

    // 3. Match by Shopify Product ID
    if (m.shopifyProductId && prodIdStr) {
      if (String(m.shopifyProductId).trim() === prodIdStr) return true;
    }

    // 4. Match by Title / Cake Name
    if (m.shopifyTitle && titleStr) {
      if (m.shopifyTitle.trim().toLowerCase() === titleStr) return true;
    }
    if (m.cakeName && titleStr) {
      if (m.cakeName.trim().toLowerCase() === titleStr) return true;
    }

    return false;
  });
}
