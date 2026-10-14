import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const restId = body?.restID || process.env.PETPOOJA_REST_ID || "SAMPLE_REST_101";

    const creds = await db.integrationCredential.findFirst({
      where: { provider: "PETPOOJA" },
    });

    const isOnline = creds?.isActive ?? true;

    return NextResponse.json({
      success: "1",
      restID: restId,
      status: isOnline ? "1" : "0",
      message: isOnline ? "Store is ONLINE" : "Store is OFFLINE",
    });
  } catch {
    return NextResponse.json({ success: "0", message: "Failed to retrieve status" }, { status: 500 });
  }
}
