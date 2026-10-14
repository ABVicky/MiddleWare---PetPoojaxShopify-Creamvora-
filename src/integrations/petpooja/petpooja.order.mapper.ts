import { ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";
import { ResolvedMappingResult } from "@/src/services/mapping-service";
import { BillingCalculator } from "@/src/services/billing-calculator";
import { PetpoojaSaveOrderPayload, PetpoojaOrderItem } from "./petpooja.types";

export interface PetpoojaMapperOptions {
  appKey: string;
  appSecret: string;
  accessToken: string;
  restId: string;
  callbackUrl?: string;
  defaultOrderType?: string; // "Delivery" | "PickUp" | "DineIn"
}

export class PetpoojaOrderMapper {
  /**
   * Transforms a Shopify order directly into the exact Petpooja V2.1.0 save_order payload.
   * If custom database mappings are provided, they are used; otherwise, it auto-maps directly using SKU/Title/VariantID.
   */
  static toPetpoojaPayload(
    order: ShopifyOrderWebhook,
    mappings?: ResolvedMappingResult | null,
    options?: PetpoojaMapperOptions
  ): PetpoojaSaveOrderPayload {
    const billing = BillingCalculator.calculateBilling(order);

    const appKey = options?.appKey || process.env.PETPOOJA_APP_KEY || "rps3igv8ucfhydx01ao6k9ebnz75tqw4";
    const appSecret = options?.appSecret || process.env.PETPOOJA_APP_SECRET || "71b70724b84d8d8ea06fe9cc0da105b07c412228";
    const accessToken = options?.accessToken || process.env.PETPOOJA_ACCESS_TOKEN || "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1";
    const restId = options?.restId || process.env.PETPOOJA_REST_ID || "SAMPLE_REST_101";
    const defaultOrderType = options?.defaultOrderType || process.env.DEFAULT_ORDER_TYPE || "Delivery";
    const appUrl = process.env.APP_URL || "https://petpooja-middleware.vercel.app";
    const callbackUrl = options?.callbackUrl || `${appUrl.replace(/\/$/, "")}/api/petpooja/order-callback`;

    // Customer formatting
    const customerName = [
      order.customer?.first_name || order.shipping_address?.first_name || "",
      order.customer?.last_name || order.shipping_address?.last_name || "",
    ]
      .join(" ")
      .trim() || order.shipping_address?.name || "Shopify Customer";

    const customerAddress = [
      order.shipping_address?.address1,
      order.shipping_address?.address2,
      order.shipping_address?.city,
      order.shipping_address?.province,
      order.shipping_address?.zip,
      order.shipping_address?.country,
    ]
      .filter(Boolean)
      .join(", ") || "Store Pickup / Not Provided";

    // Direct Line Items Mapping
    const orderItems: PetpoojaOrderItem[] = order.line_items.map((line) => {
      // Check if custom mapping exists in mappings object
      const customMapped = mappings?.mappedItems?.find(
        (m) => String(m.lineItem.id) === String(line.id)
      );

      const unitPrice = parseFloat(line.price || "0").toFixed(2);
      const discount = parseFloat(line.total_discount || "0").toFixed(2);
      const finalPrice = Math.max(0, parseFloat(unitPrice) - parseFloat(discount)).toFixed(2);

      // Auto-fallback identifier: uses Petpooja item ID if mapped, else SKU, else Variant ID
      const itemId = customMapped?.petpoojaItemId || line.sku || String(line.variant_id || line.id);
      const itemName = customMapped?.petpoojaItemName || line.title;

      const item: PetpoojaOrderItem = {
        id: itemId,
        name: itemName,
        price: unitPrice,
        final_price: finalPrice,
        quantity: String(line.quantity),
        description: line.variant_title || "",
        gst_liability: "merchant",
        item_discount: discount,
      };

      if (customMapped?.petpoojaVariationId) {
        item.variation_id = customMapped.petpoojaVariationId;
      }

      return item;
    });

    // Tax Lines
    const taxLines: Array<{ id?: string; name: string; amount: string }> = [];
    if (parseFloat(order.total_tax || "0") > 0) {
      taxLines.push({
        name: "GST / Taxes",
        amount: parseFloat(order.total_tax).toFixed(2),
      });
    }

    // Discount Lines
    const discountLines: Array<{ code?: string; title: string; amount: string }> = [];
    if (billing.totalDiscounts.greaterThan(0)) {
      discountLines.push({
        title: "Discounts",
        amount: billing.totalDiscounts.toFixed(2),
      });
    }

    // Date formatting (YYYY-MM-DD HH:MM:SS)
    const d = new Date(order.created_at || Date.now());
    const createdOn = d.toISOString().replace("T", " ").substring(0, 19);

    const deliveryCharges = billing.totalShipping.toFixed(2);

    return {
      app_key: appKey,
      app_secret: appSecret,
      access_token: accessToken,
      orderinfo: {
        OrderInfo: {
          Restaurant: {
            details: {
              restID: restId,
            },
          },
          Customer: {
            details: {
              name: customerName,
              email: order.email || order.customer?.email || "",
              phone: order.phone || order.customer?.phone || order.shipping_address?.phone || "",
              address: customerAddress,
              latitude: order.shipping_address?.latitude ? String(order.shipping_address.latitude) : "",
              longitude: order.shipping_address?.longitude ? String(order.shipping_address.longitude) : "",
            },
          },
          Order: {
            details: {
              orderID: String(order.order_number || order.name.replace("#", "")),
              payment_type: billing.paymentType,
              total: billing.shopifyReportedTotal.toFixed(2),
              discount_total: billing.totalDiscounts.toFixed(2),
              tax_total: billing.totalTax.toFixed(2),
              delivery_charges: deliveryCharges,
              packing_charges: "0.00",
              order_type: defaultOrderType,
              callback_url: callbackUrl,
              created_on: createdOn,
              description: order.note || `Shopify Order #${order.order_number || order.name}`,
            },
          },
          OrderItem: {
            details: orderItems,
          },
          Tax: {
            details: taxLines,
          },
          Discount: {
            details: discountLines,
          },
        },
      },
    };
  }
}
