/**
 * Sensitive field patterns to redact from logs and database audit entries.
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credit_?card/i,
  /cvv/i,
  /card_number/i,
  /pan/i,
  /ssn/i,
  /authorization/i,
];

/**
 * Deeply redacts sensitive keys and values from arbitrary objects or strings.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Redact Bearer tokens, JWTs, or long API keys if matched
    return data
      .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, "Bearer [REDACTED]")
      .replace(/shpat_[a-fA-F0-9]+/gi, "shpat_[REDACTED]");
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  if (typeof data === "object") {
    const redactedObj: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) =>
        pattern.test(key)
      );

      if (isSensitiveKey) {
        redactedObj[key] = "[REDACTED]";
      } else if (typeof val === "object" && val !== null) {
        redactedObj[key] = redactSensitiveData(val);
      } else {
        redactedObj[key] = val;
      }
    }

    return redactedObj;
  }

  return data;
}

/**
 * Partially masks personal email addresses: j***e@example.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "—";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Partially masks phone numbers: ******7890
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const clean = phone.trim();
  if (clean.length <= 4) return "****";
  return `******${clean.slice(-4)}`;
}
