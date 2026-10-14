import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/src/db/client";
import { ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";
import { MappingService } from "@/src/services/mapping-service";
import { BillingCalculator } from "@/src/services/billing-calculator";
import { PetpoojaOrderMapper } from "@/src/integrations/petpooja/petpooja.order.mapper";
import { PetpoojaClient } from "@/src/integrations/petpooja/petpooja.client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, scenario, customOrder } = body;

    // Standard Sample Shopify Order Fixture
    const sampleOrder: ShopifyOrderWebhook = customOrder || {
      id: Math.floor(1000000000 + Math.random() * 9000000000),
      name: `#TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      order_number: Math.floor(1000 + Math.random() * 9000),
      created_at: new Date().toISOString(),
      financial_status: scenario === "unpaid" ? "pending" : "paid",
      fulfillment_status: null,
      currency: "INR",
      subtotal_price: "448.00",
      total_discounts: scenario === "discounted" ? "50.00" : "0.00",
      total_tax: "22.40",
      total_price: scenario === "discounted" ? "420.40" : "470.40",
      payment_gateway_names: scenario === "cod" ? ["Cash on Delivery (COD)"] : ["Shopify Payments (Razorpay)"],
      note: "Test Order via Middleware Simulator",
      customer: {
        id: 99887766,
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "+919876543210",
      },
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        phone: "+919876543210",
        address1: "123 Indiranagar 100ft Road",
        address2: "Suite 4B",
        city: "Bengaluru",
        province: "Karnataka",
        zip: "560038",
        country: "India",
        latitude: 12.9716,
        longitude: 77.5946,
      },
      shipping_lines: [
        {
          price: "0.00",
          title: "Free Express Delivery",
          tax_lines: [],
        },
      ],
      line_items: [
        {
          id: 5544332211,
          product_id: 112233,
          variant_id: scenario === "unmapped" ? 999999999 : 12345678,
          title: scenario === "unmapped" ? "Special Seasonal Gourmet Dish" : "Margherita Pizza (10 inch)",
          variant_title: "Regular Crust",
          sku: scenario === "unmapped" ? "UNMAPPED-SKU-999" : "PIZZA-MARG-REG",
          quantity: 1,
          price: "299.00",
          total_discount: "0.00",
          discount_allocations: [],
          tax_lines: [{ title: "CGST", price: "7.47" }, { title: "SGST", price: "7.47" }],
        },
        {
          id: 5544332212,
          product_id: 112234,
          variant_id: 12345679,
          title: "Cheesy Garlic Bread",
          variant_title: "Standard",
          sku: "SIDES-GARLIC-BRD",
          quantity: 1,
          price: "149.00",
          total_discount: "0.00",
          discount_allocations: [],
          tax_lines: [{ title: "CGST", price: "3.73" }, { title: "SGST", price: "3.73" }],
        },
      ],
      test: true,
    };

    // 1. Action: Preview Transformation (dry-run without saving)
    if (action === "dry_run") {
      const mappingResult = await MappingService.resolveLineItems(sampleOrder.line_items);
      const billing = BillingCalculator.calculateBilling(sampleOrder);

      const previewPayload = PetpoojaOrderMapper.toPetpoojaPayload(sampleOrder, mappingResult, {
        appKey: "rps3igv8ucfhydx01ao6k9ebnz75tqw4",
        appSecret: "71b70724b84d8d8ea06fe9cc0da105b07c412228",
        accessToken: "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1",
        restId: "SAMPLE_REST_101",
        callbackUrl: "https://petpooja-middleware.vercel.app/api/petpooja/order-callback",
        defaultOrderType: "Delivery",
      });

      return NextResponse.json({
        success: true,
        scenario: scenario || "standard",
        sampleOrder,
        mappingResult,
        billing: {
          subtotal: billing.subtotal.toString(),
          totalDiscounts: billing.totalDiscounts.toString(),
          totalTax: billing.totalTax.toString(),
          totalShipping: billing.totalShipping.toString(),
          calculatedTotal: billing.calculatedTotal.toString(),
          shopifyReportedTotal: billing.shopifyReportedTotal.toString(),
          isTotalMatching: billing.isTotalMatching,
          paymentType: billing.paymentType,
        },
        petpoojaPayload: previewPayload,
      });
    }

    // 2. Action: Inject Live Webhook Event into the system
    if (action === "inject_webhook") {
      const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET || "simulated_secret";
      const rawPayload = JSON.stringify(sampleOrder);
      const deliveryId = `sim_del_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const hmacSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawPayload, "utf8")
        .digest("base64");

      // Post internally to webhook handler logic
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const webhookRes = await fetch(`${appUrl}/api/webhooks/shopify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Webhook-Id": deliveryId,
          "X-Shopify-Topic": "orders/create",
          "X-Shopify-Shop-Domain": "your-store.myshopify.com",
          "X-Shopify-Hmac-Sha256": scenario === "invalid_hmac" ? "corrupted_hmac_signature" : hmacSignature,
        },
        body: rawPayload,
      });

      const resBody = await webhookRes.json();
      return NextResponse.json({
        success: webhookRes.ok,
        status: webhookRes.status,
        response: resBody,
        deliveryId,
      });
    }

    // 3. Action: Test Mock Petpooja Direct Push
    if (action === "test_petpooja_mock") {
      const client = new PetpoojaClient({
        appKey: "rps3igv8ucfhydx01ao6k9ebnz75tqw4",
        appSecret: "71b70724b84d8d8ea06fe9cc0da105b07c412228",
        accessToken: "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1",
        restId: "SAMPLE_REST_101",
        env: "mock",
      });

      const mappingResult = await MappingService.resolveLineItems(sampleOrder.line_items);
      const payload = PetpoojaOrderMapper.toPetpoojaPayload(sampleOrder, mappingResult, {
        appKey: "rps3igv8ucfhydx01ao6k9ebnz75tqw4",
        appSecret: "71b70724b84d8d8ea06fe9cc0da105b07c412228",
        accessToken: "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1",
        restId: "SAMPLE_REST_101",
        callbackUrl: "https://petpooja-middleware.vercel.app/api/petpooja/order-callback",
      });

      const res = await client.saveOrder(payload);
      return NextResponse.json({ success: true, response: res });
    }

    return NextResponse.json({ error: "Invalid simulator action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Simulator error", details: String(error) }, { status: 500 });
  }
}
