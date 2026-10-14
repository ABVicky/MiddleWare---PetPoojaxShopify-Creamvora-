import crypto from "crypto";

export interface WebhookVerificationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates a Shopify webhook's X-Shopify-Hmac-Sha256 header using timing-safe HMAC-SHA256.
 *
 * @param rawBody - Exact raw Buffer or UTF-8 string received before any JSON parsing
 * @param hmacHeader - The value of the 'X-Shopify-Hmac-Sha256' header
 * @param secret - The Shopify App Secret or Webhook Signing Secret
 */
export function verifyShopifyWebhook(
  rawBody: Buffer | string,
  hmacHeader: string | null | undefined,
  secret: string
): WebhookVerificationResult {
  if (!secret) {
    return { isValid: false, reason: "Missing webhook signing secret" };
  }

  if (!hmacHeader) {
    return { isValid: false, reason: "Missing X-Shopify-Hmac-Sha256 header" };
  }

  try {
    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
    const computedHmac = crypto
      .createHmac("sha256", secret)
      .update(rawBuffer)
      .digest("base64");

    const computedBuffer = Buffer.from(computedHmac, "utf8");
    const headerBuffer = Buffer.from(hmacHeader, "utf8");

    if (computedBuffer.length !== headerBuffer.length) {
      return { isValid: false, reason: "Signature length mismatch" };
    }

    const isMatch = crypto.timingSafeEqual(computedBuffer, headerBuffer);
    if (!isMatch) {
      return { isValid: false, reason: "Invalid HMAC signature" };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      reason: `HMAC verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
