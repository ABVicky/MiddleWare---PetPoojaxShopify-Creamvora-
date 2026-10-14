import { NextResponse } from "next/server";
import { db } from "@/src/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalOrders,
      syncedOrders,
      queuedOrders,
      failedOrders,
      needsMappingOrders,
      needsReviewOrders,
      totalMappings,
      recentOrders,
      activeStore,
      activePetpooja,
    ] = await Promise.all([
      db.shopifyOrder.count(),
      db.shopifyOrder.count({ where: { syncStatus: "SYNCED" } }),
      db.shopifyOrder.count({ where: { syncStatus: { in: ["QUEUED", "PROCESSING", "RETRY_PENDING"] } } }),
      db.shopifyOrder.count({ where: { syncStatus: "FAILED" } }),
      db.shopifyOrder.count({ where: { syncStatus: "NEEDS_MAPPING" } }),
      db.shopifyOrder.count({ where: { syncStatus: "NEEDS_REVIEW" } }),
      db.productMapping.count({ where: { status: "MAPPED" } }),
      db.shopifyOrder.findMany({
        take: 5,
        orderBy: { shopifyCreatedAt: "desc" },
        include: { petpoojaOrder: true },
      }),
      db.connectedStore.findFirst({ where: { isActive: true } }),
      db.integrationCredential.findFirst({ where: { provider: "PETPOOJA" } }),
    ]);

    return NextResponse.json({
      metrics: {
        totalOrders,
        syncedOrders,
        queuedOrders,
        failedOrders,
        needsMappingOrders,
        needsReviewOrders,
        totalMappings,
      },
      health: {
        shopifyConnected: Boolean(activeStore || process.env.SHOPIFY_ACCESS_TOKEN),
        shopifyDomain: activeStore?.shopDomain || process.env.SHOPIFY_SHOP_DOMAIN || "Not Connected",
        petpoojaConnected: Boolean(activePetpooja || process.env.PETPOOJA_APP_KEY),
        petpoojaEnv: activePetpooja?.environment || process.env.PETPOOJA_ENV || "staging",
        petpoojaRestId: activePetpooja?.restId || process.env.PETPOOJA_REST_ID || "SAMPLE_REST_101",
      },
      recentOrders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics", details: String(error) },
      { status: 500 }
    );
  }
}
