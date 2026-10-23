import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";
import { PetpoojaClient } from "@/src/integrations/petpooja/petpooja.client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clientorderID, orderID, cancelReason, status, restID } = body;

    if (!clientorderID) {
      return NextResponse.json(
        { success: "0", message: "clientorderID is required" },
        { status: 400 }
      );
    }

    const appKey = process.env.PETPOOJA_APP_KEY || "iksfvd458an7y91etcmqo0jph6wrxbg3";
    const appSecret = process.env.PETPOOJA_APP_SECRET || "a36bed2ad5c3a821948a29c60ec53bb4d4df0051";
    const accessToken = process.env.PETPOOJA_ACCESS_TOKEN || "f756c3e36c915db29339bc8b139bfdd2f4abf4e3";
    const defaultRestId = process.env.PETPOOJA_REST_ID || "ufgiv4ye0k";

    const petpoojaClient = new PetpoojaClient({
      appKey,
      appSecret,
      accessToken,
      restId: restID || defaultRestId,
    });

    const result = await petpoojaClient.updateOrderStatus({
      clientOrderId: clientorderID,
      orderId: orderID,
      cancelReason,
      status: status !== undefined ? Number(status) : -1,
      restId: restID,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error updating order status in Petpooja", error);
    return NextResponse.json(
      {
        success: "0",
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
