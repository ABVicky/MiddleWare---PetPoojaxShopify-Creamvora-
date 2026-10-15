import { describe, it, expect } from "vitest";
import { PetpoojaOrderMapper } from "@/src/integrations/petpooja/petpooja.order.mapper";
import { ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";

describe("Petpooja Order Mapper (V2.1.0)", () => {
  const shopifyOrder: ShopifyOrderWebhook = {
    id: 1002,
    name: "#1002",
    order_number: 1002,
    created_at: "2026-03-01T15:30:00Z",
    financial_status: "paid",
    fulfillment_status: null,
    currency: "INR",
    subtotal_price: "299.00",
    total_discounts: "0.00",
    total_tax: "14.95",
    total_price: "313.95",
    payment_gateway_names: ["Razorpay"],
    note: "Please deliver hot",
    customer: {
      first_name: "Bruce",
      last_name: "Wayne",
      email: "bruce@waynecorp.com",
      phone: "+919999988888",
    },
    shipping_address: {
      name: "Bruce Wayne",
      address1: "Wayne Manor, 100 Main St",
      city: "Gotham",
      province: "MH",
      zip: "400001",
      country: "India",
    },
    shipping_lines: [{ price: "0.00" }],
    line_items: [
      {
        id: 991,
        title: "Margherita Pizza (10 inch)",
        variant_title: "Regular",
        sku: "ITEM_PIZZA_MARGHERITA",
        quantity: 1,
        price: "299.00",
        total_discount: "0.00",
      },
    ],
    test: false,
  };

  it("should transform Shopify order directly into exact Petpooja V2.1.0 structure", () => {
    const payload = PetpoojaOrderMapper.toPetpoojaPayload(shopifyOrder, null, {
      appKey: "test_key",
      appSecret: "test_secret",
      accessToken: "test_token",
      restId: "REST_101",
      callbackUrl: "https://my-app.vercel.app/api/petpooja/order-callback",
      defaultOrderType: "Delivery",
    });

    expect(payload.app_key).toBe("test_key");
    expect(payload.app_secret).toBe("test_secret");
    expect(payload.access_token).toBe("test_token");

    const orderInfo = payload.orderinfo.OrderInfo;
    expect(orderInfo.Restaurant.details.restID).toBe("REST_101");
    expect(orderInfo.Restaurant.details.res_name).toBe("Cremevora: Luxury Cakes, Mindfully Crafted");
    expect(orderInfo.Customer.details.name).toBe("Bruce Wayne");
    expect(orderInfo.Customer.details.email).toBe("bruce@waynecorp.com");
    expect(orderInfo.Customer.details.phone).toBe("+919999988888");

    expect(orderInfo.Order.details.orderID).toBe("1002");
    expect(orderInfo.Order.details.payment_type).toBe("Prepaid");
    expect(orderInfo.Order.details.total).toBe("313.95");
    expect(orderInfo.Order.details.callback_url).toBe("https://my-app.vercel.app/api/petpooja/order-callback");

    expect(orderInfo.OrderItem.details).toHaveLength(1);
    expect(orderInfo.OrderItem.details[0].id).toBe("ITEM_PIZZA_MARGHERITA");
    expect(orderInfo.OrderItem.details[0].quantity).toBe("1");
  });
});
