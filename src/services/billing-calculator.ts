import Decimal from "decimal.js";
import { ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";

// Set precision for currency calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface CalculatedOrderBilling {
  subtotal: Decimal;
  totalDiscounts: Decimal;
  totalShipping: Decimal;
  totalTax: Decimal;
  calculatedTotal: Decimal;
  shopifyReportedTotal: Decimal;
  difference: Decimal;
  isTotalMatching: boolean;
  paymentType: "COD" | "Prepaid";
  isCashOnDelivery: boolean;
  currency: string;
}

export class BillingCalculator {
  /**
   * Evaluates if an order's payment method is Cash On Delivery.
   */
  static isCod(order: ShopifyOrderWebhook): boolean {
    const gateways = order.payment_gateway_names.map((g) => g.toLowerCase());
    return (
      gateways.some(
        (g) =>
          g.includes("cash") ||
          g.includes("cod") ||
          g.includes("manual") ||
          g.includes("cash on delivery")
      ) || order.financial_status === "pending"
    );
  }

  /**
   * Calculates all financial lines, discounts, taxes, and checks totals integrity.
   */
  static calculateBilling(order: ShopifyOrderWebhook): CalculatedOrderBilling {
    let subtotal = new Decimal(0);
    let totalLineDiscounts = new Decimal(0);

    for (const item of order.line_items) {
      const price = new Decimal(item.price || 0);
      const qty = new Decimal(item.quantity || 0);
      const lineSub = price.mul(qty);
      subtotal = subtotal.plus(lineSub);

      const discount = new Decimal(item.total_discount || 0);
      totalLineDiscounts = totalLineDiscounts.plus(discount);
    }

    const orderLevelDiscount = new Decimal(order.total_discounts || 0);
    const effectiveDiscount = orderLevelDiscount.greaterThan(totalLineDiscounts)
      ? orderLevelDiscount
      : totalLineDiscounts;

    const totalShipping = new Decimal(
      order.total_shipping_price_set?.shop_money?.amount ||
      (order.shipping_lines && order.shipping_lines.length > 0 ? order.shipping_lines[0].price : "0.00")
    );

    const totalTax = new Decimal(order.total_tax || 0);
    const shopifyReportedTotal = new Decimal(order.total_price || 0);

    // Calculated total = subtotal - discounts + shipping + tax (if not tax-inclusive)
    // In Shopify, total_price is authoritative: subtotal - discounts + taxes + shipping
    // Let's compute difference against reported total
    const calculatedSum = subtotal.minus(effectiveDiscount).plus(totalShipping).plus(totalTax);
    const difference = calculatedSum.minus(shopifyReportedTotal).abs();
    // Allow up to 0.05 rounding discrepancy
    const isTotalMatching = difference.lessThanOrEqualTo(0.05);

    const isCod = this.isCod(order);
    const paymentType = isCod ? "COD" : "Prepaid";

    return {
      subtotal,
      totalDiscounts: effectiveDiscount,
      totalShipping,
      totalTax,
      calculatedTotal: calculatedSum,
      shopifyReportedTotal,
      difference,
      isTotalMatching,
      paymentType,
      isCashOnDelivery: isCod,
      currency: order.currency || "INR",
    };
  }
}
