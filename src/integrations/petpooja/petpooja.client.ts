import { logger } from "@/src/lib/logger";
import {
  PetpoojaSaveOrderPayload,
  PetpoojaSaveOrderResponse,
  PetpoojaMenuResponse,
} from "./petpooja.types";
import { PetpoojaSaveOrderResponseSchema } from "./petpooja.schemas";
import { PetpoojaError } from "./petpooja.errors";

export interface PetpoojaClientConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  restId: string;
  orderApiUrl?: string;
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
  private menuApiUrl: string;
  private storeApiUrl: string;
  private stockApiUrl: string;
  private env: "staging" | "production";

  constructor(config: PetpoojaClientConfig) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.accessToken = config.accessToken;
    this.restId = config.restId;
    this.env = config.env || (process.env.PETPOOJA_ENV as "staging" | "production") || "staging";
    this.orderApiUrl =
      config.orderApiUrl ||
      process.env.PETPOOJA_ORDER_API_URL ||
      "https://47pfzh5sf2.execute-api.ap-southeast-1.amazonaws.com/V1/save_order";
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
}
