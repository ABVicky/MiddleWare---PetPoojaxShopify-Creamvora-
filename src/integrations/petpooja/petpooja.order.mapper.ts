import { ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";
import { ResolvedMappingResult } from "@/src/services/mapping-service";
import { BillingCalculator } from "@/src/services/billing-calculator";
import { PetpoojaSaveOrderPayload, PetpoojaOrderItem } from "./petpooja.types";

export interface PetpoojaMapperOptions {
  appKey: string;
  appSecret: string;
  accessToken: string;
  restId: string;
  callbackUrl: string;
  defaultOrderType?: string; // "Delivery" | "PickUp" | "DineIn"
}

export class PetpoojaOrderMapper {
  /**
   * Transforms a Shopify order with resolved item mappings into the exact Petpooja V2.1.0 save_order payload.
   */
  static toPetpoojaPayload(
    order: ShopifyOrderWebhook,
    mappings: ResolvedMappingResult,
    options: PetpoojaMapperOptions
  ): PetpoojaSaveOrderPayload {
    const billing = BillingCalculator.calculateBilling(order);

    // Format customer
    const customerName = [
      order.customer?.first_name || order.shipping_address?.first_name || "",
      order.customer?.last_name || order.shipping_address?.last_name || "",
    ]
      .join(" ")
      .trim() || order.shipping_address?.name || "Online Customer";

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

    // Format order items
    const orderItems: PetpoojaOrderItem[] = mappings.mappedItems.map((mapped) => {
      const line = mapped.lineItem;
      const unitPrice = parseFloat(line.price).toFixed(2);
      const discount = parseFloat(line.total_discount || "0").toFixed(2);
      const finalPrice = Math.max(0, parseFloat(unitPrice) - parseFloat(discount)).toFixed(2);

      const item: PetpoojaOrderItem = {
        id: mapped.petpoojaItemId,
        name: mapped.petpoojaItemName || line.title,
        price: unitPrice,
        final_price: finalPrice,
        quantity: String(line.quantity),
        description: line.variant_title || "",
        gst_liability: "merchant",
        item_discount: discount,
      };

      if (mapped.petpoojaVariationId) {
        item.variation_id = mapped.petpoojaVariationId;
      }

      return item;
    });

    // Format tax lines
    const taxLines: Array<{ id?: string; name: string; amount: string }> = [];
    if (parseFloat(order.total_tax) > 0) {
      taxLines.push({
        name: "GST / Taxes",
        amount: parseFloat(order.total_tax).toFixed(2),
      });
    }

    // Format discount lines
    const discountLines: Array<{ code?: string; title: string; amount: string }> = [];
    if (billing.totalDiscounts.greaterThan(0)) {
      discountLines.push({
        title: "Discounts",
        amount: billing.totalDiscounts.toFixed(2),
      });
    }

    // Format created_on date to YYYY-MM-DD HH:MM:SS
    const d = new Date(order.created_at);
    const createdOn = d.toISOString().replace("T", " ").substring(0, 19);

    const packingCharges = "0.00";
    const deliveryCharges = billing.totalShipping.toFixed(2);

    return {
      app_key: options.appKey,
      app_secret: options.appSecret,
      access_token: options.accessToken,
      orderinfo: {
        OrderInfo: {
          Restaurant: {
            details: {
              restID: options.restId,
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
              packing_charges: packingCharges,
              order_type: options.defaultOrderType || "Delivery",
              callback_url: options.callbackUrl,
              created_on: createdOn,
              description: order.note || `Shopify Order #${order.order_number}`,
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
