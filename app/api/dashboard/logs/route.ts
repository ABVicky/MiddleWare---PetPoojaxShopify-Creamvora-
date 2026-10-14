import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30")));

    const [auditLogs, syncAttempts] = await Promise.all([
      db.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.syncAttempt.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          syncJob: {
            include: { shopifyOrder: true },
          },
        },
      }),
    ]);

    return NextResponse.json({ auditLogs, syncAttempts });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs", details: String(error) }, { status: 500 });
  }
}
