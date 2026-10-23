import { logger } from "@/src/lib/logger";
import {
  PetpoojaSaveOrderPayload,
  PetpoojaSaveOrderResponse,
  PetpoojaMenuResponse,
  PetpoojaUpdateOrderStatusPayload,
  PetpoojaUpdateOrderStatusResponse,
  PetpoojaRiderStatusPayload,
  PetpoojaRiderStatusResponse,
} from "./petpooja.types";
import { PetpoojaSaveOrderResponseSchema } from "./petpooja.schemas";
import { PetpoojaError } from "./petpooja.errors";

export interface PetpoojaClientConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  restId: string;
  orderApiUrl?: string;
  riderStatusUrl?: string;
  updateOrderStatusUrl?: string;
  menuApiUrl?: string;
  storeApiUrl?: string;
  stockApiUrl?: string;
  env?: "staging" | "production";
}

export class PetpoojaClient {
  private appKey: string;
  private appSecret: string;
  private accessToken: string;
  private restId: string;
  private orderApiUrl: string;
  private riderStatusUrl: string;
  private updateOrderStatusUrl: string;
  private menuApiUrl: string;
  private storeApiUrl: string;
  private stockApiUrl: string;
  private env: "staging" | "production";

  constructor(config: PetpoojaClientConfig) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.accessToken = config.accessToken;
    this.restId = config.restId;
    this.env = config.env || (process.env.PETPOOJA_ENV as "staging" | "production") || "production";
    this.orderApiUrl =
      config.orderApiUrl ||
      process.env.PETPOOJA_ORDER_API_URL ||
      "https://pponlineordercb.petpooja.com/save_order";
    this.riderStatusUrl =
      config.riderStatusUrl ||
      process.env.PETPOOJA_RIDER_STATUS_URL ||
      "https://pponlineordercb.petpooja.com/rider_status_update";
    this.updateOrderStatusUrl =
      config.updateOrderStatusUrl ||
      process.env.PETPOOJA_UPDATE_ORDER_STATUS_URL ||
      "https://pponlineordercb.petpooja.com/update_order_status";
    this.menuApiUrl =
      config.menuApiUrl ||
      process.env.PETPOOJA_MENU_API_URL ||
      "https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/mapped_restaurant_menus";
    this.storeApiUrl =
      config.storeApiUrl ||
      process.env.PETPOOJA_STORE_API_URL ||
      "https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/update_store_status";
    this.stockApiUrl =
      config.stockApiUrl ||
      process.env.PETPOOJA_STOCK_API_URL ||
      "https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/update_item_stock";
  }

  /**
   * Pushes a live online order into Petpooja POS via the official AWS API Gateway endpoint.
   */
  async saveOrder(payload: PetpoojaSaveOrderPayload): Promise<PetpoojaSaveOrderResponse> {
    try {
      const response = await fetch(this.orderApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        throw new PetpoojaError(
          `Invalid JSON response from Petpooja (HTTP ${response.status}): ${rawText}`,
          "NETWORK_ERROR",
          { httpStatus: response.status }
        );
      }

      const validation = PetpoojaSaveOrderResponseSchema.safeParse(parsedData);
      if (!validation.success) {
        throw new PetpoojaError(
          `Unexpected Petpooja response structure: ${JSON.stringify(parsedData)}`,
          "VALIDATION_ERROR",
          { httpStatus: response.status, rawResponse: parsedData }
        );
      }

      const result = validation.data as PetpoojaSaveOrderResponse;

      // Petpooja returns success: "0" when business logic fails
      if (result.success !== "1") {
        throw PetpoojaError.fromApiResponse(result, response.status);
      }

      return result;
    } catch (error) {
      if (error instanceof PetpoojaError) {
        throw error;
      }
      throw new PetpoojaError(
        `Failed to reach Petpooja save_order endpoint: ${error instanceof Error ? error.message : String(error)}`,
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * Fetches the mapped restaurant catalog / menu from Petpooja POS.
   */
  async fetchMenu(restId?: string): Promise<PetpoojaMenuResponse> {
    const targetRestId = restId || this.restId;

    const response = await fetch(this.menuApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "app-key": this.appKey,
        "app-secret": this.appSecret,
        "access-token": this.accessToken,
      },
      body: JSON.stringify({ restID: targetRestId }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new PetpoojaError(
        `Menu API error (${response.status}): ${errText}`,
        response.status === 401 ? "AUTH_ERROR" : "BUSINESS_RULE_FAILURE",
        { httpStatus: response.status }
      );
    }

    return (await response.json()) as PetpoojaMenuResponse;
  }

  /**
   * Tests credentials against Petpooja servers.
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const menuRes = await this.fetchMenu();
      if (menuRes.success === "1") {
        return { success: true, message: "Successfully connected to Petpooja API" };
      }
      return { success: false, message: menuRes.message || "Petpooja responded with error" };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Pushes an order status update (e.g., cancellation) to the Petpooja POS.
   */
  async updateOrderStatus(params: {
    clientOrderId: string;
    orderId?: string;
    cancelReason?: string;
    status?: number;
    restId?: string;
  }): Promise<PetpoojaUpdateOrderStatusResponse> {
    const payload: PetpoojaUpdateOrderStatusPayload = {
      app_key: this.appKey,
      app_secret: this.appSecret,
      access_token: this.accessToken,
      restID: params.restId || this.restId,
      orderID: params.orderId || "",
      clientorderID: params.clientOrderId,
      cancelReason: params.cancelReason || "Cancelled by customer/store",
      status: params.status ?? -1,
    };

    try {
      logger.info("Sending update_order_status to Petpooja", {
        clientOrderId: params.clientOrderId,
        status: payload.status,
        restID: payload.restID,
      });

      const response = await fetch(this.updateOrderStatusUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        throw new PetpoojaError(
          `Invalid JSON response from Petpooja update_order_status (HTTP ${response.status}): ${rawText}`,
          "NETWORK_ERROR",
          { httpStatus: response.status }
        );
      }

      return parsedData as PetpoojaUpdateOrderStatusResponse;
    } catch (error) {
      if (error instanceof PetpoojaError) throw error;
      throw new PetpoojaError(
        `Failed to reach Petpooja update_order_status endpoint: ${error instanceof Error ? error.message : String(error)}`,
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * Pushes rider / delivery status updates to the Petpooja POS.
   */
  async updateRiderStatus(params: {
    clientOrderId?: string;
    orderId?: string;
    status?: number | string;
    riderName?: string;
    riderPhoneNumber?: string;
    restId?: string;
  }): Promise<PetpoojaRiderStatusResponse> {
    const payload: PetpoojaRiderStatusPayload = {
      app_key: this.appKey,
      app_secret: this.appSecret,
      access_token: this.accessToken,
      restID: params.restId || this.restId,
      orderID: params.orderId || "",
      clientorderID: params.clientOrderId || "",
      status: params.status ?? 4,
      rider_name: params.riderName || "",
      rider_phone_number: params.riderPhoneNumber || "",
    };

    try {
      logger.info("Sending rider_status_update to Petpooja", {
        clientOrderId: params.clientOrderId,
        status: payload.status,
        riderName: payload.rider_name,
        restID: payload.restID,
      });

      const response = await fetch(this.riderStatusUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        throw new PetpoojaError(
          `Invalid JSON response from Petpooja rider_status_update (HTTP ${response.status}): ${rawText}`,
          "NETWORK_ERROR",
          { httpStatus: response.status }
        );
      }

      return parsedData as PetpoojaRiderStatusResponse;
    } catch (error) {
      if (error instanceof PetpoojaError) throw error;
      throw new PetpoojaError(
        `Failed to reach Petpooja rider_status_update endpoint: ${error instanceof Error ? error.message : String(error)}`,
        "NETWORK_ERROR"
      );
    }
  }
}

