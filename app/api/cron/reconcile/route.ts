import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = new Date();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find recent orders
  const orders = await db.shopifyOrder.findMany({
    where: {
      shopifyCreatedAt: { gte: oneDayAgo },
    },
    include: {
      petpoojaOrder: true,
      syncJobs: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  let matchedCount = 0;
  let mismatchedCount = 0;
  let fixedCount = 0;

  for (const order of orders) {
    if (order.syncStatus === "SYNCED" && order.petpoojaOrder?.petpoojaOrderId) {
      matchedCount++;
    } else if (order.syncStatus === "PROCESSING") {
      // If stuck in PROCESSING for more than 15 minutes, recover back to QUEUED
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (order.updatedAt < fifteenMinAgo) {
        await db.shopifyOrder.update({
          where: { id: order.id },
          data: { syncStatus: "QUEUED" },
        });

        if (order.syncJobs[0]) {
          await db.syncJob.update({
            where: { id: order.syncJobs[0].id },
            data: { state: "QUEUED", lockedAt: null },
          });
        }

        fixedCount++;
      } else {
        mismatchedCount++;
      }
    } else if (order.syncStatus === "NEEDS_MAPPING" || order.syncStatus === "NEEDS_REVIEW") {
      mismatchedCount++;
    }
  }

  // Record reconciliation run
  await db.reconciliationRun.create({
    data: {
      runType: "SCHEDULED",
      status: "COMPLETED",
      checkedOrdersCount: orders.length,
      matchedCount,
      mismatchedCount,
      fixedCount,
      summaryJson: JSON.stringify({
        checked: orders.length,
        matched: matchedCount,
        mismatched: mismatchedCount,
        recovered: fixedCount,
      }),
      startedAt: startTime,
      completedAt: new Date(),
    },
  });

  logger.info("Order reconciliation run completed", {
    checked: orders.length,
    matched: matchedCount,
    mismatched: mismatchedCount,
    fixed: fixedCount,
  });

  return NextResponse.json({
    status: "COMPLETED",
    checked: orders.length,
    matched: matchedCount,
    mismatched: mismatchedCount,
    fixed: fixedCount,
  });
}
