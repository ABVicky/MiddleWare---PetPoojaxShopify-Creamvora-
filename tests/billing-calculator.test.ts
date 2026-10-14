import { describe, it, expect } from "vitest";
import { BillingCalculator } from "@/src/services/billing-calculator";
import { ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";

describe("Billing & Financial Integrity Calculator", () => {
  const baseOrder: ShopifyOrderWebhook = {
    id: 1001,
    name: "#1001",
    order_number: 1001,
    created_at: "2026-03-01T12:00:00Z",
    financial_status: "paid",
    fulfillment_status: null,
    currency: "INR",
    subtotal_price: "400.00",
    total_discounts: "50.00",
    total_tax: "17.50",
    total_price: "367.50",
    payment_gateway_names: ["Razorpay"],
    shipping_lines: [{ price: "0.00" }],
    line_items: [
      {
        id: 1,
        title: "Margherita Pizza",
        quantity: 2,
        price: "200.00",
        total_discount: "50.00",
      },
    ],
    test: false,
  };

  it("should calculate correct billing sums with decimal accuracy", () => {
    const result = BillingCalculator.calculateBilling(baseOrder);
    expect(result.subtotal.toString()).toBe("400");
    expect(result.totalDiscounts.toString()).toBe("50");
    expect(result.totalTax.toString()).toBe("17.5");
    expect(result.calculatedTotal.toString()).toBe("367.5");
    expect(result.isTotalMatching).toBe(true);
    expect(result.paymentType).toBe("Prepaid");
    expect(result.isCashOnDelivery).toBe(false);
  });

  it("should identify Cash on Delivery orders correctly", () => {
    const codOrder: ShopifyOrderWebhook = {
      ...baseOrder,
      financial_status: "pending",
      payment_gateway_names: ["Cash on Delivery (COD)"],
    };
    const result = BillingCalculator.calculateBilling(codOrder);
    expect(result.paymentType).toBe("COD");
    expect(result.isCashOnDelivery).toBe(true);
  });

  it("should detect mismatch when reported total deviates from calculated sum", () => {
    const mismatchedOrder: ShopifyOrderWebhook = {
      ...baseOrder,
      total_price: "500.00", // Tampered or mismatched
    };
    const result = BillingCalculator.calculateBilling(mismatchedOrder);
    expect(result.isTotalMatching).toBe(false);
    expect(result.difference.greaterThan(0.05)).toBe(true);
  });
});
