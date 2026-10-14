export type PetpoojaErrorCode =
  | "AUTH_ERROR"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "STORE_CLOSED"
  | "ITEM_UNAVAILABLE"
  | "RATE_LIMITED"
  | "BUSINESS_RULE_FAILURE"
  | "UNKNOWN_ERROR";

export class PetpoojaError extends Error {
  public readonly code: PetpoojaErrorCode;
  public readonly httpStatus?: number;
  public readonly isRetryable: boolean;
  public readonly rawResponse?: unknown;

  constructor(
    message: string,
    code: PetpoojaErrorCode = "UNKNOWN_ERROR",
    options?: {
      httpStatus?: number;
      isRetryable?: boolean;
      rawResponse?: unknown;
    }
  ) {
    super(message);
    this.name = "PetpoojaError";
    this.code = code;
    this.httpStatus = options?.httpStatus;
    this.rawResponse = options?.rawResponse;

    // Retryable: network errors, 5xx, or 429
    if (options?.isRetryable !== undefined) {
      this.isRetryable = options.isRetryable;
    } else {
      this.isRetryable =
        code === "NETWORK_ERROR" ||
        code === "RATE_LIMITED" ||
        (options?.httpStatus !== undefined && options.httpStatus >= 500);
    }
  }

  static fromApiResponse(response: { success: string; message: string }, status: number): PetpoojaError {
    const msg = response.message || "Petpooja API request failed";
    let code: PetpoojaErrorCode = "BUSINESS_RULE_FAILURE";

    if (status === 401 || status === 403 || /invalid (app_?key|access_?token|auth)/i.test(msg)) {
      code = "AUTH_ERROR";
    } else if (/store.*(closed|inactive|off)/i.test(msg)) {
      code = "STORE_CLOSED";
    } else if (/item.*(not found|inactive|out of stock)/i.test(msg)) {
      code = "ITEM_UNAVAILABLE";
    } else if (status === 429 || /rate.*limit/i.test(msg)) {
      code = "RATE_LIMITED";
    }

    return new PetpoojaError(msg, code, {
      httpStatus: status,
      rawResponse: response,
      isRetryable: code === "RATE_LIMITED" || status >= 500,
    });
  }
}
