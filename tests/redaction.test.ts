import { describe, it, expect } from "vitest";
import { redactSensitiveData, maskEmail, maskPhone } from "@/src/lib/redact";

describe("Redaction and PII Security", () => {
  it("should redact API secrets, access tokens, and passwords", () => {
    const sensitive = {
      appKey: "rps3igv8ucfhydx01ao6k9ebnz75tqw4",
      appSecret: "71b70724b84d8d8ea06fe9cc0da105b07c412228",
      accessToken: "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1",
      passwordHash: "$2b$10$xyz...",
      orderTotal: "450.00",
    };

    const clean = redactSensitiveData(sensitive) as Record<string, unknown>;
    expect(clean.appKey).toBe("[REDACTED]");
    expect(clean.appSecret).toBe("[REDACTED]");
    expect(clean.accessToken).toBe("[REDACTED]");
    expect(clean.passwordHash).toBe("[REDACTED]");
    expect(clean.orderTotal).toBe("450.00");
  });

  it("should mask customer emails and phone numbers", () => {
    expect(maskEmail("bruce.wayne@example.com")).toBe("b***e@example.com");
    expect(maskPhone("+919876543210")).toBe("******3210");
  });
});
