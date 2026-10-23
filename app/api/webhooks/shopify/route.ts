import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";
import { verifyShopifyWebhook } from "@/src/integrations/shopify/webhook-verifier";
import { ShopifyOrderWebhookSchema, ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";
import { PetpoojaClient } from "@/src/integrations/petpooja/petpooja.client";
import { PetpoojaOrderMapper } from "@/src/integrations/petpooja/petpooja.order.mapper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const deliveryId = req.headers.get("x-shopify-webhook-id");
  const topic = req.headers.get("x-shopify-topic");
  const shopDomain = req.headers.get("x-shopify-shop-domain");
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

  // Read raw request buffer for HMAC verification
  const rawArrayBuffer = await req.arrayBuffer();
  const rawBuffer = Buffer.from(rawArrayBuffer);
  const rawBodyText = rawBuffer.toString("utf8");

  // 1. Mandatory Header Verification
  if (!deliveryId || !topic) {
    logger.warn("Webhook rejected: Missing required Shopify headers", { deliveryId, topic, shopDomain });
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  // 2. Cryptographic HMAC Verification (if secret is configured in Vercel environment)
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  if (webhookSecret && hmacHeader) {
    const verification = verifyShopifyWebhook(rawBuffer, hmacHeader, webhookSecret);
    if (!verification.isValid) {
      logger.warn("Webhook HMAC verification failed", {
        reason: verification.reason,
        deliveryId,
        shopDomain,
      });
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  // 3. Parse JSON Payload
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBodyText);
  } catch (err) {
    logger.error("Webhook payload is not valid JSON", err, { deliveryId });
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  // 4. Handle Compliance Topics
  if (topic.includes("redact") || topic.includes("data_request")) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 5. Order Cancellation Synchronization (orders/cancelled)
  if (topic === "orders/cancelled") {
    const parseResult = ShopifyOrderWebhookSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      logger.error("Shopify Order Schema validation failed on cancellation", parseResult.error, { deliveryId });
      return NextResponse.json(
        { error: "Payload schema mismatch", details: parseResult.error },
        { status: 422 }
      );
    }

    const order: ShopifyOrderWebhook = parseResult.data;
    const clientOrderId = String(order.order_number || order.name.replace("#", ""));
    const cancelReason = order.cancel_reason || "Cancelled in Shopify";

    logger.info("Direct Sync: Processing Shopify Order Cancellation for Petpooja POS", {
      orderNumber: order.order_number,
      clientOrderId,
      cancelReason,
    });

    const appKey = process.env.PETPOOJA_APP_KEY || "iksfvd458an7y91etcmqo0jph6wrxbg3";
    const appSecret = process.env.PETPOOJA_APP_SECRET || "a36bed2ad5c3a821948a29c60ec53bb4d4df0051";
    const accessToken = process.env.PETPOOJA_ACCESS_TOKEN || "f756c3e36c915db29339bc8b139bfdd2f4abf4e3";
    const restId = process.env.PETPOOJA_REST_ID || "ufgiv4ye0k";
    const env = (process.env.PETPOOJA_ENV as "staging" | "production") || "production";

    const petpoojaClient = new PetpoojaClient({
      appKey,
      appSecret,
      accessToken,
      restId,
      env,
    });

    try {
      const cancelResponse = await petpoojaClient.updateOrderStatus({
        clientOrderId,
        cancelReason,
        status: -1,
      });

      logger.info("Direct Sync: Order cancellation sent to Petpooja POS", {
        clientOrderId,
        cancelResponse,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Order cancellation relayed to Petpooja POS",
          clientOrderID: clientOrderId,
          petpoojaResponse: cancelResponse,
        },
        { status: 200 }
      );
    } catch (error) {
      logger.error("Direct Sync Cancellation to Petpooja failed", error, { clientOrderId });
      return NextResponse.json(
        {
          success: false,
          error: "Failed to push cancellation to Petpooja POS",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 502 }
      );
    }
  }

  // 6. Direct Order Synchronization (orders/create, orders/updated)
  if (topic === "orders/create" || topic === "orders/updated") {
    const parseResult = ShopifyOrderWebhookSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      logger.error("Shopify Order Schema validation failed", parseResult.error, { deliveryId });
      return NextResponse.json(
        { error: "Payload schema mismatch", details: parseResult.error },
        { status: 422 }
      );
    }

    const order: ShopifyOrderWebhook = parseResult.data;
    const clientOrderId = String(order.order_number || order.name.replace("#", ""));

    // If order was updated to cancelled state
    if (order.cancelled_at) {
      const cancelReason = order.cancel_reason || "Cancelled in Shopify";
      const appKey = process.env.PETPOOJA_APP_KEY || "iksfvd458an7y91etcmqo0jph6wrxbg3";
      const appSecret = process.env.PETPOOJA_APP_SECRET || "a36bed2ad5c3a821948a29c60ec53bb4d4df0051";
      const accessToken = process.env.PETPOOJA_ACCESS_TOKEN || "f756c3e36c915db29339bc8b139bfdd2f4abf4e3";
      const restId = process.env.PETPOOJA_REST_ID || "ufgiv4ye0k";
      const env = (process.env.PETPOOJA_ENV as "staging" | "production") || "production";

      const petpoojaClient = new PetpoojaClient({
        appKey,
        appSecret,
        accessToken,
        restId,
        env,
      });

      try {
        const cancelResponse = await petpoojaClient.updateOrderStatus({
          clientOrderId,
          cancelReason,
          status: -1,
        });

        return NextResponse.json({
          success: true,
          message: "Updated order cancellation relayed to Petpooja POS",
          clientOrderID: clientOrderId,
          petpoojaResponse: cancelResponse,
        });
      } catch (cancelError) {
        logger.error("Failed to sync cancellation to Petpooja", cancelError, { clientOrderId });
        return NextResponse.json(
          {
            success: false,
            error: "Failed to push cancellation to Petpooja POS",
            details: cancelError instanceof Error ? cancelError.message : String(cancelError),
          },
          { status: 502 }
        );
      }
    }

    logger.info("Direct Sync: Processing Shopify Order for Petpooja POS", {
      orderNumber: order.order_number,
      clientOrderId,
      total: order.total_price,
    });

    // Petpooja API Credentials from Vercel Environment Variables
    const appKey = process.env.PETPOOJA_APP_KEY || "iksfvd458an7y91etcmqo0jph6wrxbg3";
    const appSecret = process.env.PETPOOJA_APP_SECRET || "a36bed2ad5c3a821948a29c60ec53bb4d4df0051";
    const accessToken = process.env.PETPOOJA_ACCESS_TOKEN || "f756c3e36c915db29339bc8b139bfdd2f4abf4e3";
    const restId = process.env.PETPOOJA_REST_ID || "ufgiv4ye0k";
    const restaurantName = process.env.PETPOOJA_RESTAURANT_NAME || "Cremevora";
    const env = (process.env.PETPOOJA_ENV as "staging" | "production") || "production";

    const petpoojaClient = new PetpoojaClient({
      appKey,
      appSecret,
      accessToken,
      restId,
      env,
    });

    // Transform directly to Petpooja V2.1.0 save_order payload
    const petpoojaPayload = PetpoojaOrderMapper.toPetpoojaPayload(order, null, {
      appKey,
      appSecret,
      accessToken,
      restId,
      restaurantName,
    });

    // DIRECT RELAY: Call Petpooja save_order API immediately
    try {
      const petpoojaResponse = await petpoojaClient.saveOrder(petpoojaPayload);

      logger.info("Direct Sync SUCCESS: Order immediately sent to Petpooja POS", {
        clientOrderId,
        petpoojaOrderId: petpoojaResponse.orderID,
        restID: petpoojaResponse.restID,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Order directly synced and relayed to Petpooja POS",
          petpoojaOrderId: petpoojaResponse.orderID,
          clientOrderID: clientOrderId,
          status: "SYNCED_TO_PETPOOJA",
        },
        { status: 200 }
      );
    } catch (error) {
      logger.error("Direct Sync to Petpooja failed", error, { clientOrderId });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to push order to Petpooja POS",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ accepted: true, topic }, { status: 200 });
}
