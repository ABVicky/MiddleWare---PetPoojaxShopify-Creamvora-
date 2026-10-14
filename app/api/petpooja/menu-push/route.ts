import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    logger.info("Petpooja Menu Push received", {
      restaurantId: payload?.restaurants?.[0]?.restaurantid,
      itemCount: payload?.items?.length,
    });

    return NextResponse.json({
      success: "1",
      message: "Menu received successfully",
    });
  } catch (error) {
    logger.error("Error in menu push", error);
    return NextResponse.json({ success: "0", message: "Failed" }, { status: 500 });
  }
}
