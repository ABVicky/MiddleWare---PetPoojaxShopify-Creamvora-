import { db } from "@/src/db/client";
import { ShopifyLineItem } from "@/src/integrations/shopify/shopify.types";

export interface ResolvedMappingResult {
  isFullyMapped: boolean;
  mappedItems: Array<{
    lineItem: ShopifyLineItem;
    petpoojaItemId: string;
    petpoojaVariationId?: string;
    petpoojaItemName: string;
    petpoojaAddonDetails?: unknown;
  }>;
  unmappedItems: Array<{
    lineItemId: string | number;
    title: string;
    variantTitle?: string | null;
    sku?: string | null;
    variantId?: string | number | null;
    productId?: string | number | null;
  }>;
}

export class MappingService {
  /**
   * Resolves Petpooja item IDs for each line item in a Shopify order.
   */
  static async resolveLineItems(lineItems: ShopifyLineItem[]): Promise<ResolvedMappingResult> {
    const mappedItems: ResolvedMappingResult["mappedItems"] = [];
    const unmappedItems: ResolvedMappingResult["unmappedItems"] = [];

    // Extract all variant IDs and SKUs to fetch in bulk
    const variantIds = lineItems
      .map((item) => (item.variant_id ? String(item.variant_id) : null))
      .filter((id): id is string => Boolean(id));

    const skus = lineItems
      .map((item) => item.sku?.trim())
      .filter((sku): sku is string => Boolean(sku));

    // Query active mappings
    const mappings = await db.productMapping.findMany({
      where: {
        OR: [
          { shopifyVariantId: { in: variantIds } },
          { shopifySku: { in: skus } },
        ],
        status: "MAPPED",
      },
    });

    const mappingByVariantId = new Map(mappings.map((m) => [m.shopifyVariantId, m]));
    const mappingBySku = new Map(
      mappings.filter((m) => Boolean(m.shopifySku)).map((m) => [m.shopifySku!, m])
    );

    for (const item of lineItems) {
      const varId = item.variant_id ? String(item.variant_id) : null;
      const sku = item.sku?.trim();

      const matched = (varId && mappingByVariantId.get(varId)) || (sku && mappingBySku.get(sku));

      if (matched && matched.petpoojaItemId) {
        mappedItems.push({
          lineItem: item,
          petpoojaItemId: matched.petpoojaItemId,
          petpoojaVariationId: matched.petpoojaVariationId || undefined,
          petpoojaItemName: matched.petpoojaItemName,
          petpoojaAddonDetails: matched.petpoojaAddonDetails
            ? JSON.parse(matched.petpoojaAddonDetails)
            : undefined,
        });
      } else {
        unmappedItems.push({
          lineItemId: item.id,
          title: item.title,
          variantTitle: item.variant_title,
          sku: item.sku,
          variantId: item.variant_id,
          productId: item.product_id,
        });
      }
    }

    return {
      isFullyMapped: unmappedItems.length === 0,
      mappedItems,
      unmappedItems,
    };
  }

  /**
   * Upserts a product mapping entry.
   */
  static async upsertMapping(data: {
    shopifyVariantId: string;
    shopifyProductId?: string;
    shopifySku?: string;
    shopifyTitle: string;
    shopifyVariantTitle?: string;
    petpoojaItemId: string;
    petpoojaItemName: string;
    petpoojaVariationId?: string;
    petpoojaVariationName?: string;
    petpoojaAddonDetails?: string;
  }) {
    return db.productMapping.upsert({
      where: { shopifyVariantId: data.shopifyVariantId },
      create: {
        shopifyVariantId: data.shopifyVariantId,
        shopifyProductId: data.shopifyProductId,
        shopifySku: data.shopifySku,
        shopifyTitle: data.shopifyTitle,
        shopifyVariantTitle: data.shopifyVariantTitle,
        petpoojaItemId: data.shopifyVariantId ? data.petpoojaItemId : "",
        petpoojaItemName: data.petpoojaItemName,
        petpoojaVariationId: data.petpoojaVariationId,
        petpoojaVariationName: data.petpoojaVariationName,
        petpoojaAddonDetails: data.petpoojaAddonDetails,
        status: "MAPPED",
        lastValidatedAt: new Date(),
      },
      update: {
        shopifyProductId: data.shopifyProductId,
        shopifySku: data.shopifySku,
        shopifyTitle: data.shopifyTitle,
        shopifyVariantTitle: data.shopifyVariantTitle,
        petpoojaItemId: data.petpoojaItemId,
        petpoojaItemName: data.petpoojaItemName,
        petpoojaVariationId: data.petpoojaVariationId,
        petpoojaVariationName: data.petpoojaVariationName,
        petpoojaAddonDetails: data.petpoojaAddonDetails,
        status: "MAPPED",
        lastValidatedAt: new Date(),
      },
    });
  }
}
