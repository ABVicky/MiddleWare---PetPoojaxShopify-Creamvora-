import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await db.integrationSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        autoSyncTrigger: "payment_confirmed",
        requireExactTotalMatch: true,
        allowPartialMappingSync: false,
        defaultOrderType: "Delivery",
        maxRetries: 5,
        enableMockMode: false,
      },
      update: {},
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      autoSyncTrigger,
      requireExactTotalMatch,
      allowPartialMappingSync,
      defaultOrderType,
      maxRetries,
      enableMockMode,
      alertEmail,
    } = body;

    const settings = await db.integrationSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        autoSyncTrigger: autoSyncTrigger || "payment_confirmed",
        requireExactTotalMatch: requireExactTotalMatch ?? true,
        allowPartialMappingSync: allowPartialMappingSync ?? false,
        defaultOrderType: defaultOrderType || "Delivery",
        maxRetries: maxRetries || 5,
        enableMockMode: enableMockMode ?? false,
        alertEmail,
      },
      update: {
        autoSyncTrigger: autoSyncTrigger || undefined,
        requireExactTotalMatch: requireExactTotalMatch ?? undefined,
        allowPartialMappingSync: allowPartialMappingSync ?? undefined,
        defaultOrderType: defaultOrderType || undefined,
        maxRetries: maxRetries || undefined,
        enableMockMode: enableMockMode ?? undefined,
        alertEmail: alertEmail || undefined,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings", details: String(error) }, { status: 500 });
  }
}
