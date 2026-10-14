import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    logger.info("Petpooja item-off received", body);
    return NextResponse.json({ success: "1", message: "Item disabled" });
  } catch {
    return NextResponse.json({ success: "0", message: "Failed" }, { status: 500 });
  }
}
