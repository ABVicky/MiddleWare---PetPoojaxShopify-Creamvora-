import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    logger.info("Petpooja store status update", body);
    return NextResponse.json({
      success: "1",
      message: "Store status updated",
    });
  } catch (error) {
    logger.error("Error updating store status", error);
    return NextResponse.json({ success: "0", message: "Failed" }, { status: 500 });
  }
}
