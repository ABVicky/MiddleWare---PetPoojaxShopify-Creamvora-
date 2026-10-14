import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Petpooja Menu Sharing Push Endpoint
 * Called by Petpooja POS whenever a merchant updates items, categories, or prices.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    logger.info("Petpooja Menu Push received", {
      restaurantId: payload?.restaurants?.[0]?.restaurantid,
      itemCount: payload?.items?.length,
    });

    // Auto-record or update known Petpooja menu items for the product mapping table
    if (Array.isArray(payload?.items)) {
      for (const item of payload.items) {
        if (!item.itemid || !item.itemname) continue;

        // Check if an existing mapping exists for this Petpooja item ID
        const existing = await db.productMapping.findFirst({
          where: { petpoojaItemId: item.itemid },
        });

        if (existing) {
          await db.productMapping.update({
            where: { id: existing.id },
            data: {
              petpoojaItemName: item.itemname,
              lastValidatedAt: new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: "1",
      message: "Menu received and processed successfully",
    });
  } catch (error) {
    logger.error("Error processing Petpooja Menu Push", error);
    return NextResponse.json({ success: "0", message: "Failed to process menu push" }, { status: 500 });
  }
}
