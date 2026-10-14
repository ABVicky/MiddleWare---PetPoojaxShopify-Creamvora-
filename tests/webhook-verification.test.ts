import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyShopifyWebhook } from "@/src/integrations/shopify/webhook-verifier";

describe("Shopify Webhook Verification", () => {
  const secret = "test_shopify_webhook_secret_key_12345";
  const payload = JSON.stringify({
    id: 1001,
    name: "#1001",
    total_price: "450.00",
  });

  it("should accept a valid HMAC signature", () => {
    const validHmac = crypto
      .createHmac("sha256", secret)
      .update(Buffer.from(payload, "utf8"))
      .digest("base64");

    const result = verifyShopifyWebhook(payload, validHmac, secret);
    expect(result.isValid).toBe(true);
  });

  it("should reject an invalid or tampered HMAC signature", () => {
    const corruptedHmac = "aW52YWxpZF9zaWduYXR1cmVfaGVyZQ==";
    const result = verifyShopifyWebhook(payload, corruptedHmac, secret);
    expect(result.isValid).toBe(false);
  });

  it("should reject when secret is missing", () => {
    const validHmac = crypto
      .createHmac("sha256", secret)
      .update(Buffer.from(payload, "utf8"))
      .digest("base64");

    const result = verifyShopifyWebhook(payload, validHmac, "");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Missing webhook signing secret");
  });

  it("should reject when header is missing", () => {
    const result = verifyShopifyWebhook(payload, null, secret);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Missing X-Shopify-Hmac-Sha256 header");
  });
});
