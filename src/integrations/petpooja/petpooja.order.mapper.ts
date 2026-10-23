import { ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";
import { BillingCalculator } from "@/src/services/billing-calculator";
import { PetpoojaSaveOrderPayload, PetpoojaOrderItem } from "./petpooja.types";

export interface PetpoojaMapperOptions {
  appKey: string;
  appSecret: string;
  accessToken: string;
  restId: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  callbackUrl?: string;
  defaultOrderType?: string; // "H" | "P" | "D" | "Delivery" | "PickUp" | "DineIn"
}

export class PetpoojaOrderMapper {
  /**
   * Transforms a Shopify order directly into the exact Petpooja V2.1.0 save_order payload.
   * Fully matches Petpooja POS specification: OrderInfo.Restaurant, Customer, Order, OrderItem, Tax.
   */
  static toPetpoojaPayload(
    order: ShopifyOrderWebhook,
    mappings?: unknown,
    options?: PetpoojaMapperOptions
  ): PetpoojaSaveOrderPayload {
    const billing = BillingCalculator.calculateBilling(order);

    const appKey = options?.appKey || process.env.PETPOOJA_APP_KEY || "iksfvd458an7y91etcmqo0jph6wrxbg3";
    const appSecret = options?.appSecret || process.env.PETPOOJA_APP_SECRET || "a36bed2ad5c3a821948a29c60ec53bb4d4df0051";
    const accessToken = options?.accessToken || process.env.PETPOOJA_ACCESS_TOKEN || "f756c3e36c915db29339bc8b139bfdd2f4abf4e3";
    const restId = options?.restId || process.env.PETPOOJA_REST_ID || "ufgiv4ye0k";
    const restaurantName =
      options?.restaurantName ||
      process.env.PETPOOJA_RESTAURANT_NAME ||
      "Cremevora";
    const restaurantAddress =
      options?.restaurantAddress ||
      process.env.PETPOOJA_RESTAURANT_ADDRESS ||
      "";
    const restaurantPhone =
      options?.restaurantPhone ||
      process.env.PETPOOJA_RESTAURANT_PHONE ||
      "";

    // Resolve Petpooja order_type code: H (Home Delivery), P (PickUp), D (DineIn)
    const rawOrderType = (options?.defaultOrderType || process.env.DEFAULT_ORDER_TYPE || "H").toUpperCase();
    const orderType =
      rawOrderType === "DELIVERY" || rawOrderType === "H"
        ? "H"
        : rawOrderType === "PICKUP" || rawOrderType === "P"
        ? "P"
        : rawOrderType === "DINEIN" || rawOrderType === "D"
        ? "D"
        : rawOrderType;

    const appUrl = process.env.APP_URL || "https://petpooja-middleware1.vercel.app";
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

    // Direct Line Items Auto-Mapping
    const orderItems: PetpoojaOrderItem[] = order.line_items.map((line, idx) => {
      const unitPrice = parseFloat(line.price || "0").toFixed(2);
      const discount = parseFloat(line.total_discount || "0").toFixed(2);
      const finalPrice = Math.max(0, parseFloat(unitPrice) - parseFloat(discount)).toFixed(2);

      // Identifier: Uses SKU if available, otherwise Variant ID, otherwise Line Item ID
      const itemId = line.sku || String(line.variant_id || line.id);
      const itemName = line.title;

      const itemTax = (line.tax_lines && line.tax_lines.length > 0)
        ? line.tax_lines.map((tl, tIdx) => {
            const rateNum = typeof tl.rate === "number" ? tl.rate : parseFloat(String(tl.rate || 0));
            return {
              id: String(tIdx + 1),
              name: tl.title || "GST",
              tax_percentage: String((rateNum * 100).toFixed(2).replace(/\.00$/, "")),
              amount: parseFloat(tl.price || "0").toFixed(2),
            };
          })
        : [];

      const item: PetpoojaOrderItem = {
        id: itemId,
        name: itemName,
        tax_inclusive: line.taxable === false || order.taxes_included === true,
        gst_liability: "vendor",
        item_tax: itemTax,
        item_discount: discount !== "0.00" ? discount : "",
        price: unitPrice,
        final_price: finalPrice,
        quantity: String(line.quantity),
        description: line.variant_title || "",
        variation_name: line.variant_title || "",
        variation_id: line.variant_id ? String(line.variant_id) : "",
        AddonItem: {
          details: [],
        },
      };

      return item;
    });

    // Tax Lines
    const taxLines = [];
    if (order.tax_lines && order.tax_lines.length > 0) {
      order.tax_lines.forEach((tl, idx) => {
        const rateNum = typeof tl.rate === "number" ? tl.rate : parseFloat(String(tl.rate || 0));
        taxLines.push({
          id: String(idx + 1),
          title: tl.title || "GST",
          type: "P",
          price: String((rateNum * 100).toFixed(2).replace(/\.00$/, "")),
          tax: parseFloat(tl.price || "0").toFixed(2),
          restaurant_liable_amt: "0.00",
        });
      });
    } else if (parseFloat(order.total_tax || "0") > 0) {
      taxLines.push({
        id: "1",
        title: "GST",
        type: "P",
        price: "0",
        tax: parseFloat(order.total_tax).toFixed(2),
        restaurant_liable_amt: "0.00",
      });
    }

    // Discount Lines
    const discountLines = [];
    if (billing.totalDiscounts.greaterThan(0)) {
      discountLines.push({
        title: "Discounts",
        amount: billing.totalDiscounts.toFixed(2),
      });
    }

    // Date formatting (YYYY-MM-DD HH:MM:SS)
    const d = new Date(order.created_at || Date.now());
    const createdOn = d.toISOString().replace("T", " ").substring(0, 19);
    const [createdDate, createdTime] = createdOn.split(" ");

    const isCod = billing.paymentType === "COD";
    const totalStr = billing.shopifyReportedTotal.toFixed(2);
    const deliveryChargesStr = billing.totalShipping.toFixed(2);
    const discountTotalStr = billing.totalDiscounts.toFixed(2);
    const taxTotalStr = billing.totalTax.toFixed(2);

    return {
      app_key: appKey,
      app_secret: appSecret,
      access_token: accessToken,
      orderinfo: {
        OrderInfo: {
          Restaurant: {
            details: {
              res_name: restaurantName,
              address: restaurantAddress,
              contact_information: restaurantPhone,
              restID: restId,
              name: restaurantName,
            },
          },
          Customer: {
            details: {
              email: order.email || order.customer?.email || "",
              name: customerName,
              address: customerAddress,
              phone: order.phone || order.customer?.phone || order.shipping_address?.phone || "",
              latitude: order.shipping_address?.latitude ? String(order.shipping_address.latitude) : "",
              longitude: order.shipping_address?.longitude ? String(order.shipping_address.longitude) : "",
            },
          },
          Order: {
            details: {
              orderID: String(order.order_number || order.name.replace("#", "")),
              preorder_date: createdDate,
              preorder_time: createdTime,
              service_charge: "0",
              sc_tax_amount: "0",
              delivery_charges: deliveryChargesStr,
              dc_tax_percentage: "0",
              dc_tax_amount: "0",
              dc_gst_details: [
                {
                  gst_liable: "vendor",
                  amount: "0",
                },
                {
                  gst_liable: "restaurant",
                  amount: "0",
                },
              ],
              packing_charges: "0",
              pc_tax_amount: "0",
              pc_tax_percentage: "0",
              pc_gst_details: [
                {
                  gst_liable: "vendor",
                  amount: "0",
                },
                {
                  gst_liable: "restaurant",
                  amount: "0",
                },
              ],
              order_type: orderType,
              ondc_bap: "",
              advanced_order: "N",
              urgent_order: false,
              urgent_time: 20,
              payment_type: isCod ? "COD" : "Prepaid",
              table_no: "",
              no_of_persons: "0",
              discount_total: discountTotalStr,
              tax_total: taxTotalStr,
              discount_type: "F",
              total: totalStr,
              description: order.note || "",
              created_on: createdOn,
              enable_delivery: 1,
              min_prep_time: 20,
              callback_url: callbackUrl,
              collect_cash: isCod ? totalStr : "0",
              otp: "",
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
        udid: "",
        device_type: "Web",
      },
    };
  }
}
