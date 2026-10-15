import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const restId = body?.restID || process.env.PETPOOJA_REST_ID || "3w51vcd6et";

    return NextResponse.json({
      success: "1",
      restID: restId,
      status: "1",
      message: "Store is ONLINE",
    });
  } catch {
    return NextResponse.json({ success: "0", message: "Failed" }, { status: 500 });
  }
}
