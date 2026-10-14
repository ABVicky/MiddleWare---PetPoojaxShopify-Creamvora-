import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { logger } from "@/src/lib/logger";
import { PetpoojaCallbackSchema } from "@/src/integrations/petpooja/petpooja.schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = PetpoojaCallbackSchema.safeParse(body);

    if (!validation.success) {
      logger.warn("Invalid Petpooja callback payload", { errors: validation.error });
      return NextResponse.json({ success: "0", message: "Invalid callback payload" }, { status: 400 });
    }

    const { restID, orderID, status, cancel_reason } = validation.data;
    logger.info("Petpooja order callback received", { restID, orderID, status, cancel_reason });

    // Look up PetpoojaOrder by clientOrderId (which is the Shopify orderID) or petpoojaOrderId
    const existingOrder = await db.petpoojaOrder.findFirst({
      where: {
        OR: [
          { clientOrderId: orderID },
          { petpoojaOrderId: orderID },
        ],
      },
      include: { shopifyOrder: true },
    });

    if (existingOrder) {
      await db.petpoojaOrder.update({
        where: { id: existingOrder.id },
        data: {
          orderStatus: status.toUpperCase(),
          errorMessage: cancel_reason || existingOrder.errorMessage,
        },
      });

      // Update ShopifyOrder syncStatus if status indicates completion or cancellation
      let finalSyncStatus = existingOrder.shopifyOrder.syncStatus;
      if (status.toLowerCase().includes("reject") || status.toLowerCase().includes("cancel")) {
        finalSyncStatus = "CANCELLED";
      } else if (status.toLowerCase().includes("accept") || status.toLowerCase().includes("food ready")) {
        finalSyncStatus = "SYNCED";
      }

      await db.shopifyOrder.update({
        where: { id: existingOrder.shopifyOrderId },
        data: { syncStatus: finalSyncStatus },
      });

      // Log in audit trail
      await db.auditLog.create({
        data: {
          action: "PETPOOJA_ORDER_CALLBACK",
          entityType: "PetpoojaOrder",
          entityId: existingOrder.id,
          actor: "PETPOOJA_POS",
          detailsJson: JSON.stringify({ restID, orderID, status, cancel_reason }),
        },
      });
    }

    return NextResponse.json({ success: "1", message: "Callback processed successfully" });
  } catch (error) {
    logger.error("Error handling Petpooja callback", error);
    return NextResponse.json({ success: "0", message: "Internal server error" }, { status: 500 });
  }
}
