import { db } from "@/src/db/client";
import { logger } from "@/src/lib/logger";
import { ShopifyOrderWebhook } from "@/src/integrations/shopify/shopify.types";
import { MappingService } from "@/src/services/mapping-service";
import { BillingCalculator } from "@/src/services/billing-calculator";
import { PetpoojaClient } from "./petpooja.client";
import { PetpoojaOrderMapper } from "./petpooja.order.mapper";
import { PetpoojaError } from "./petpooja.errors";

export interface SyncOrderResult {
  success: boolean;
  state: "SYNCED" | "NEEDS_MAPPING" | "NEEDS_REVIEW" | "RETRY_PENDING" | "FAILED";
  petpoojaOrderId?: string;
  errorMessage?: string;
  isRetryable?: boolean;
}

export class PetpoojaOrdersService {
  /**
   * Synchronizes a stored Shopify order to Petpooja POS.
   */
  static async syncOrderToPetpooja(shopifyOrderId: string, attemptNumber = 1): Promise<SyncOrderResult> {
    const startTime = Date.now();

    // 1. Fetch Order with items and active sync job
    const orderRecord = await db.shopifyOrder.findUnique({
      where: { shopifyOrderId },
      include: {
        items: true,
        syncJobs: {
          where: { jobType: "ORDER_SYNC" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!orderRecord) {
      return {
        success: false,
        state: "FAILED",
        errorMessage: `Shopify order ${shopifyOrderId} not found in database`,
      };
    }

    const currentJob = orderRecord.syncJobs[0];

    // Mark order & job as PROCESSING
    await db.shopifyOrder.update({
      where: { id: orderRecord.id },
      data: { syncStatus: "PROCESSING" },
    });

    if (currentJob) {
      await db.syncJob.update({
        where: { id: currentJob.id },
        data: { state: "PROCESSING", lockedAt: new Date() },
      });
    }

    let parsedShopifyPayload: ShopifyOrderWebhook;
    try {
      parsedShopifyPayload = JSON.parse(orderRecord.rawJson) as ShopifyOrderWebhook;
    } catch {
      await this.markJobFailed(orderRecord.id, currentJob?.id, "Failed to parse stored order JSON", attemptNumber, startTime);
      return { success: false, state: "FAILED", errorMessage: "Invalid stored JSON" };
    }

    // 2. Resolve Product Mappings
    const mappingResult = await MappingService.resolveLineItems(parsedShopifyPayload.line_items);

    if (!mappingResult.isFullyMapped) {
      const unmappedNames = mappingResult.unmappedItems.map((i) => i.title).join(", ");
      const msg = `Order contains unmapped products: ${unmappedNames}`;

      await db.shopifyOrder.update({
        where: { id: orderRecord.id },
        data: { syncStatus: "NEEDS_MAPPING" },
      });

      if (currentJob) {
        await db.syncJob.update({
          where: { id: currentJob.id },
          data: { state: "NEEDS_MAPPING", lastError: msg, lockedAt: null },
        });

        await db.syncAttempt.create({
          data: {
            syncJobId: currentJob.id,
            attemptNumber,
            state: "NEEDS_MAPPING",
            errorMessage: msg,
            durationMs: Date.now() - startTime,
          },
        });
      }

      logger.warn("Order requires product mapping", { shopifyOrderId, unmapped: mappingResult.unmappedItems });
      return { success: false, state: "NEEDS_MAPPING", errorMessage: msg };
    }

    // 3. Billing & Financial Validation
    const billing = BillingCalculator.calculateBilling(parsedShopifyPayload);
    const settings = await db.integrationSettings.findUnique({ where: { id: "default" } });

    if (settings?.requireExactTotalMatch && !billing.isTotalMatching) {
      const msg = `Billing mismatch: Reported total ${billing.shopifyReportedTotal} does not match calculated sum ${billing.calculatedTotal} (diff: ${billing.difference})`;

      await db.shopifyOrder.update({
        where: { id: orderRecord.id },
        data: { syncStatus: "NEEDS_REVIEW" },
      });

      if (currentJob) {
        await db.syncJob.update({
          where: { id: currentJob.id },
          data: { state: "NEEDS_REVIEW", lastError: msg, lockedAt: null },
        });

        await db.syncAttempt.create({
          data: {
            syncJobId: currentJob.id,
            attemptNumber,
            state: "NEEDS_REVIEW",
            errorMessage: msg,
            durationMs: Date.now() - startTime,
          },
        });
      }

      return { success: false, state: "NEEDS_REVIEW", errorMessage: msg };
    }

    // 4. Fetch Active Petpooja Credentials
    const creds = await db.integrationCredential.findFirst({
      where: { provider: "PETPOOJA", isActive: true },
    });

    const appKey = creds?.appKey || process.env.PETPOOJA_APP_KEY || "rps3igv8ucfhydx01ao6k9ebnz75tqw4";
    const appSecret = creds?.appSecret || process.env.PETPOOJA_APP_SECRET || "71b70724b84d8d8ea06fe9cc0da105b07c412228";
    const accessToken = creds?.accessToken || process.env.PETPOOJA_ACCESS_TOKEN || "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1";
    const restId = creds?.restId || process.env.PETPOOJA_REST_ID || "SAMPLE_REST_101";
    const appUrl = process.env.APP_URL || "https://petpooja-middleware.vercel.app";

    const petpoojaClient = new PetpoojaClient({
      appKey,
      appSecret,
      accessToken,
      restId,
      env: (creds?.environment as "mock" | "staging" | "production") || (process.env.PETPOOJA_ENV as "mock" | "staging" | "production") || "staging",
    });

    // 5. Build Petpooja Payload
    const callbackUrl = `${appUrl.replace(/\/$/, "")}/api/petpooja/order-callback`;
    const payload = PetpoojaOrderMapper.toPetpoojaPayload(parsedShopifyPayload, mappingResult, {
      appKey,
      appSecret,
      accessToken,
      restId,
      callbackUrl,
      defaultOrderType: settings?.defaultOrderType || "Delivery",
    });

    // 6. Execute save_order API Call
    try {
      const response = await petpoojaClient.saveOrder(payload);

      const petpoojaAssignedId = response.orderID || `POS_${Date.now()}`;

      // Update / Upsert PetpoojaOrder record
      await db.petpoojaOrder.upsert({
        where: { shopifyOrderId: orderRecord.id },
        create: {
          shopifyOrderId: orderRecord.id,
          clientOrderId: payload.orderinfo.OrderInfo.Order.details.orderID,
          petpoojaOrderId: petpoojaAssignedId,
          restId,
          orderStatus: "SUBMITTED",
          requestPayload: JSON.stringify(payload),
          responsePayload: JSON.stringify(response),
          httpStatusCode: 200,
          syncedAt: new Date(),
        },
        update: {
          petpoojaOrderId: petpoojaAssignedId,
          orderStatus: "SUBMITTED",
          requestPayload: JSON.stringify(payload),
          responsePayload: JSON.stringify(response),
          syncedAt: new Date(),
        },
      });

      // Update Order & Job status to SYNCED
      await db.shopifyOrder.update({
        where: { id: orderRecord.id },
        data: { syncStatus: "SYNCED" },
      });

      if (currentJob) {
        await db.syncJob.update({
          where: { id: currentJob.id },
          data: {
            state: "SYNCED",
            lastError: null,
            lockedAt: null,
            lockedBy: null,
          },
        });

        await db.syncAttempt.create({
          data: {
            syncJobId: currentJob.id,
            attemptNumber,
            state: "SYNCED",
            requestPayload: JSON.stringify(payload),
            responsePayload: JSON.stringify(response),
            durationMs: Date.now() - startTime,
          },
        });
      }

      logger.info("Order successfully synced to Petpooja POS", {
        shopifyOrderId,
        petpoojaOrderId: petpoojaAssignedId,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        state: "SYNCED",
        petpoojaOrderId: petpoojaAssignedId,
      };
    } catch (error) {
      const petErr = error instanceof PetpoojaError ? error : new PetpoojaError(String(error));
      const isRetryable = petErr.isRetryable && attemptNumber < (currentJob?.maxAttempts || 5);
      const nextState = isRetryable ? "RETRY_PENDING" : "FAILED";

      // Compute backoff: 2^attempt * 30 seconds + jitter
      const backoffSec = Math.min(3600, Math.pow(2, attemptNumber) * 30 + Math.floor(Math.random() * 10));
      const nextRunAt = new Date(Date.now() + backoffSec * 1000);

      await db.shopifyOrder.update({
        where: { id: orderRecord.id },
        data: { syncStatus: nextState },
      });

      if (currentJob) {
        await db.syncJob.update({
          where: { id: currentJob.id },
          data: {
            state: nextState,
            attempts: attemptNumber,
            lastError: petErr.message,
            nextRunAt: isRetryable ? nextRunAt : currentJob.nextRunAt,
            lockedAt: null,
            lockedBy: null,
          },
        });

        await db.syncAttempt.create({
          data: {
            syncJobId: currentJob.id,
            attemptNumber,
            state: nextState,
            requestPayload: JSON.stringify(payload),
            responsePayload: JSON.stringify(petErr.rawResponse || null),
            errorMessage: petErr.message,
            durationMs: Date.now() - startTime,
          },
        });
      }

      logger.error("Failed to sync order to Petpooja POS", petErr, {
        shopifyOrderId,
        attemptNumber,
        isRetryable,
        nextRunAt,
      });

      return {
        success: false,
        state: nextState,
        errorMessage: petErr.message,
        isRetryable,
      };
    }
  }

  private static async markJobFailed(
    orderId: string,
    jobId: string | undefined,
    errorMessage: string,
    attemptNumber: number,
    startTime: number
  ) {
    await db.shopifyOrder.update({
      where: { id: orderId },
      data: { syncStatus: "FAILED" },
    });

    if (jobId) {
      await db.syncJob.update({
        where: { id: jobId },
        data: { state: "FAILED", lastError: errorMessage, lockedAt: null },
      });

      await db.syncAttempt.create({
        data: {
          syncJobId: jobId,
          attemptNumber,
          state: "FAILED",
          errorMessage,
          durationMs: Date.now() - startTime,
        },
      });
    }
  }
}
