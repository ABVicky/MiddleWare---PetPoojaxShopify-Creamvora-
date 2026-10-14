import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { logger } from "@/src/lib/logger";
import { verifyShopifyWebhook } from "@/src/integrations/shopify/webhook-verifier";
import { ShopifyOrderWebhookSchema, ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";
import { PetpoojaOrdersService } from "@/src/integrations/petpooja/petpooja.orders.service";
import Decimal from "decimal.js";

// Disable automatic body parsing to preserve raw buffer for HMAC verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const deliveryId = req.headers.get("x-shopify-webhook-id");
  const topic = req.headers.get("x-shopify-topic");
  const shopDomain = req.headers.get("x-shopify-shop-domain");
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

  // Read raw request buffer
  const rawArrayBuffer = await req.arrayBuffer();
  const rawBuffer = Buffer.from(rawArrayBuffer);
  const rawBodyText = rawBuffer.toString("utf8");

  // 1. Mandatory Header Verification
  if (!deliveryId || !topic || !shopDomain) {
    logger.warn("Webhook rejected: Missing required Shopify headers", { deliveryId, topic, shopDomain });
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  // 2. Fetch Store / Webhook Secret
  const store = await db.connectedStore.findUnique({
    where: { shopDomain },
  });

  const webhookSecret =
    store?.webhookSecret ||
    process.env.SHOPIFY_WEBHOOK_SECRET ||
    process.env.SHOPIFY_CLIENT_SECRET ||
    "";

  // 3. Cryptographic HMAC Verification
  const verification = verifyShopifyWebhook(rawBuffer, hmacHeader, webhookSecret);
  if (!verification.isValid) {
    logger.warn("Webhook HMAC verification failed", {
      reason: verification.reason,
      deliveryId,
      shopDomain,
      topic,
    });

    // Record invalid delivery attempt for security audit
    await db.webhookEvent.create({
      data: {
        deliveryId,
        topic,
        shopDomain,
        rawPayload: rawBodyText.substring(0, 1000), // store snippet
        hmacSignature: hmacHeader || "MISSING",
        status: "INVALID_SIGNATURE",
        errorMessage: verification.reason,
      },
    }).catch(() => null);

    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  // 4. Deduplication Check (Idempotency)
  const existingDelivery = await db.webhookEvent.findUnique({
    where: { deliveryId },
  });

  if (existingDelivery) {
    logger.info("Webhook duplicate delivery ignored", { deliveryId, topic });
    return NextResponse.json({ message: "Duplicate webhook delivery ignored" }, { status: 200 });
  }

  // 5. Parse and Validate Payload
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBodyText);
  } catch (err) {
    logger.error("Webhook payload is not valid JSON", err, { deliveryId });
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  // Record Webhook Event in Outbox
  await db.webhookEvent.create({
    data: {
      deliveryId,
      topic,
      shopDomain,
      rawPayload: rawBodyText,
      hmacSignature: hmacHeader || "",
      status: "PROCESSED",
    },
  });

  // Handle GDPR / Compliance Topics
  if (
    topic === "customers/data_request" ||
    topic === "customers/redact" ||
    topic === "shop/redact"
  ) {
    logger.info(`Shopify compliance webhook received: ${topic}`, { deliveryId, shopDomain });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 6. Handle Order Topics
  if (topic === "orders/create" || topic === "orders/updated") {
    const parseResult = ShopifyOrderWebhookSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      logger.error("Shopify Order Schema validation failed", parseResult.error, { deliveryId });
      return NextResponse.json({ error: "Payload schema mismatch" }, { status: 422 });
    }

    const order: ShopifyOrderWebhook = parseResult.data;
    const shopifyOrderId = String(order.id);
    const orderNumber = String(order.order_number || order.name);

    const subtotal = new Decimal(order.subtotal_price || 0);
    const discounts = new Decimal(order.total_discounts || 0);
    const shipping = new Decimal(
      order.total_shipping_price_set?.shop_money?.amount ||
      (order.shipping_lines[0]?.price || 0)
    );
    const tax = new Decimal(order.total_tax || 0);
    const total = new Decimal(order.total_price || 0);

    const isCod =
      order.financial_status === "pending" ||
      order.payment_gateway_names.some((g) =>
        /cash|cod|manual/i.test(g)
      );

    const customerName = [
      order.customer?.first_name || order.shipping_address?.first_name || "",
      order.customer?.last_name || order.shipping_address?.last_name || "",
    ]
      .join(" ")
      .trim() || order.shipping_address?.name || "Customer";

    const customerAddress = [
      order.shipping_address?.address1,
      order.shipping_address?.address2,
      order.shipping_address?.city,
      order.shipping_address?.province,
      order.shipping_address?.zip,
      order.shipping_address?.country,
    ]
      .filter(Boolean)
      .join(", ");

    // Upsert Shopify Order record
    const savedOrder = await db.shopifyOrder.upsert({
      where: { shopifyOrderId },
      create: {
        shopifyOrderId,
        orderNumber,
        shopDomain,
        storeId: store?.id,
        currency: order.currency || "INR",
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        subtotalPrice: subtotal.toString(),
        totalDiscounts: discounts.toString(),
        totalShipping: shipping.toString(),
        totalTax: tax.toString(),
        totalPrice: total.toString(),
        paymentGateway: order.payment_gateway_names.join(", "),
        isCashOnDelivery: isCod,
        customerName,
        customerEmail: order.email || order.customer?.email,
        customerPhone: order.phone || order.customer?.phone || order.shipping_address?.phone,
        deliveryAddress: customerAddress,
        deliveryNotes: order.note,
        shopifyCreatedAt: new Date(order.created_at),
        syncStatus: "QUEUED",
        rawJson: rawBodyText,
      },
      update: {
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        subtotalPrice: subtotal.toString(),
        totalDiscounts: discounts.toString(),
        totalShipping: shipping.toString(),
        totalTax: tax.toString(),
        totalPrice: total.toString(),
        paymentGateway: order.payment_gateway_names.join(", "),
        isCashOnDelivery: isCod,
        customerName,
        customerEmail: order.email || order.customer?.email,
        customerPhone: order.phone || order.customer?.phone || order.shipping_address?.phone,
        deliveryAddress: customerAddress,
        deliveryNotes: order.note,
        rawJson: rawBodyText,
      },
    });

    // Delete and recreate order items for this order
    await db.shopifyOrderItem.deleteMany({ where: { orderId: savedOrder.id } });
    await db.shopifyOrderItem.createMany({
      data: order.line_items.map((line) => ({
        orderId: savedOrder.id,
        shopifyLineItemId: String(line.id),
        shopifyProductId: line.product_id ? String(line.product_id) : null,
        shopifyVariantId: line.variant_id ? String(line.variant_id) : null,
        sku: line.sku,
        title: line.title,
        variantTitle: line.variant_title,
        quantity: line.quantity,
        unitPrice: new Decimal(line.price || 0).toString(),
        discountAmount: new Decimal(line.total_discount || 0).toString(),
        totalPrice: new Decimal(line.price || 0).mul(line.quantity).toString(),
      })),
    });

    // Determine Eligibility:
    // If settings autoSyncTrigger === 'payment_confirmed', requires paid or COD
    const settings = await db.integrationSettings.findUnique({ where: { id: "default" } });
    const trigger = settings?.autoSyncTrigger || "payment_confirmed";
    const isEligible =
      trigger === "order_created" ||
      order.financial_status === "paid" ||
      isCod;

    if (isEligible) {
      // Upsert SyncJob
      const job = await db.syncJob.upsert({
        where: { id: `sync_${shopifyOrderId}` },
        create: {
          id: `sync_${shopifyOrderId}`,
          shopifyOrderId: savedOrder.id,
          jobType: "ORDER_SYNC",
          state: "QUEUED",
        },
        update: {
          state: "QUEUED",
          attempts: 0,
          nextRunAt: new Date(),
        },
      });

      // Proactively trigger async background processing without blocking webhook response
      void PetpoojaOrdersService.syncOrderToPetpooja(shopifyOrderId, 1).catch((err) => {
        logger.error("Async order processing background error", err, { shopifyOrderId });
      });

      logger.info("Order queued for Petpooja POS synchronization", {
        shopifyOrderId,
        orderNumber,
        jobId: job.id,
      });
    } else {
      logger.info("Order saved but not yet eligible for POS sync", {
        shopifyOrderId,
        financialStatus: order.financial_status,
        trigger,
      });
    }

    return NextResponse.json({ accepted: true, orderId: shopifyOrderId }, { status: 200 });
  }

  // Handle Order Cancelled Topic
  if (topic === "orders/cancelled") {
    const parsed = parsedJson as { id: number | string; cancel_reason?: string };
    const shopifyOrderId = String(parsed.id);

    await db.shopifyOrder.updateMany({
      where: { shopifyOrderId },
      data: { syncStatus: "CANCELLED" },
    });

    logger.info("Shopify order marked as CANCELLED", { shopifyOrderId, reason: parsed.cancel_reason });
    return NextResponse.json({ accepted: true, cancelled: true }, { status: 200 });
  }

  return NextResponse.json({ accepted: true, topic }, { status: 200 });
}
