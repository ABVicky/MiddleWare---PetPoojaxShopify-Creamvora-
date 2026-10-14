import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restID, itemID } = body;
    const items = Array.isArray(itemID) ? itemID : [itemID].filter(Boolean);

    logger.info("Petpooja item-on received", { restID, items });

    // Mark mapped items as in-stock
    await db.productMapping.updateMany({
      where: { petpoojaItemId: { in: items } },
      data: { status: "MAPPED" },
    });

    return NextResponse.json({
      success: "1",
      message: `Items enabled successfully: ${items.join(", ")}`,
    });
  } catch (error) {
    logger.error("Error in item-on", error);
    return NextResponse.json({ success: "0", message: "Failed to enable items" }, { status: 500 });
  }
}
