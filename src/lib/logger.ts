import { redactSensitiveData } from "./redact";

export interface LogContext {
  correlationId?: string | null;
  orderId?: string | null;
  shopifyOrderId?: string | null;
  topic?: string | null;
  shopDomain?: string | null;
  deliveryId?: string | null;
  attempt?: number | null;
  [key: string]: unknown;
}

class Logger {
  private formatLog(level: "INFO" | "WARN" | "ERROR" | "DEBUG", message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const cleanContext = context ? redactSensitiveData(context) : undefined;
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(cleanContext as Record<string, unknown>),
    });
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatLog("INFO", message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatLog("WARN", message, context));
  }

  error(message: string, error?: unknown, context?: LogContext) {
    const errDetails =
      error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : { errorMessage: String(error) };
    console.error(this.formatLog("ERROR", message, { ...errDetails, ...context }));
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("DEBUG", message, context));
    }
  }
}

export const logger = new Logger();
