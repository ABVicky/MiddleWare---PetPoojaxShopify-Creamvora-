import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restID, store_status, turn_on_time, reason } = body;

    logger.info("Petpooja store status update", { restID, store_status, turn_on_time, reason });

    const isOnline = store_status === "1";

    await db.integrationCredential.updateMany({
      where: { provider: "PETPOOJA" },
      data: { isActive: isOnline },
    });

    return NextResponse.json({
      success: "1",
      message: `Store status updated to ${isOnline ? "ONLINE" : "OFFLINE"}`,
    });
  } catch (error) {
    logger.error("Error updating store status", error);
    return NextResponse.json({ success: "0", message: "Failed to update store status" }, { status: 500 });
  }
}
