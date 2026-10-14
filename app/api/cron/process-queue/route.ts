import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { logger } from "@/src/lib/logger";
import { PetpoojaOrdersService } from "@/src/integrations/petpooja/petpooja.orders.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. Verify Vercel Cron or Bearer Secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const lockExpiration = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago

  // 2. Fetch eligible jobs with concurrency lock safety
  const eligibleJobs = await db.syncJob.findMany({
    where: {
      state: { in: ["QUEUED", "RETRY_PENDING"] },
      nextRunAt: { lte: now },
      OR: [
        { lockedAt: null },
        { lockedAt: { lt: lockExpiration } },
      ],
    },
    take: 10,
    orderBy: { priority: "desc" },
    include: { shopifyOrder: true },
  });

  if (eligibleJobs.length === 0) {
    return NextResponse.json({ message: "No pending jobs in queue", processed: 0 });
  }

  const results: Array<{ jobId: string; shopifyOrderId: string; state: string; error?: string }> = [];

  for (const job of eligibleJobs) {
    // Acquire lock
    await db.syncJob.update({
      where: { id: job.id },
      data: {
        lockedAt: new Date(),
        lockedBy: "CRON_WORKER",
      },
    });

    const nextAttempt = job.attempts + 1;
    const res = await PetpoojaOrdersService.syncOrderToPetpooja(job.shopifyOrder.shopifyOrderId, nextAttempt);

    results.push({
      jobId: job.id,
      shopifyOrderId: job.shopifyOrder.shopifyOrderId,
      state: res.state,
      error: res.errorMessage,
    });
  }

  logger.info("Cron queue processor finished batch", { count: results.length });

  return NextResponse.json({
    processed: results.length,
    timestamp: new Date().toISOString(),
    results,
  });
}
