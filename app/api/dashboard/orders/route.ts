import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { PetpoojaOrdersService } from "@/src/integrations/petpooja/petpooja.orders.service";
import { SyncState } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") as SyncState | null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.syncStatus = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.shopifyOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { shopifyCreatedAt: "desc" },
        include: {
          items: true,
          petpoojaOrder: true,
          syncJobs: { take: 1, orderBy: { createdAt: "desc" } },
        },
      }),
      db.shopifyOrder.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, shopifyOrderId } = body;

    if (action === "retry" && shopifyOrderId) {
      const order = await db.shopifyOrder.findUnique({
        where: { shopifyOrderId },
        include: { syncJobs: true },
      });

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Reset state to QUEUED and trigger sync immediately
      await db.shopifyOrder.update({
        where: { id: order.id },
        data: { syncStatus: "QUEUED" },
      });

      const res = await PetpoojaOrdersService.syncOrderToPetpooja(shopifyOrderId, 1);
      return NextResponse.json({ success: true, result: res });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process order action", details: String(error) }, { status: 500 });
  }
}
