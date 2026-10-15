import { describe, it, expect, vi, beforeEach } from "vitest";
import { PetpoojaClient } from "@/src/integrations/petpooja/petpooja.client";
import { PetpoojaError } from "@/src/integrations/petpooja/petpooja.errors";

describe("Petpooja API Client", () => {
  const client = new PetpoojaClient({
    appKey: "test_key",
    appSecret: "test_secret",
    accessToken: "test_token",
    restId: "REST_101",
    env: "staging",
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully process order push via API", async () => {
    const mockResponse = {
      success: "1",
      message: "Order successfully saved in Petpooja POS",
      restID: "REST_101",
      clientOrderID: "ORDER_101",
      orderID: "PETPOOJA_POS_987654",
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    } as unknown as Response);

    const testPayload = {
      app_key: "test_key",
      app_secret: "test_secret",
      access_token: "test_token",
      orderinfo: {
        OrderInfo: {
          Restaurant: { details: { restID: "REST_101" } },
          Customer: { details: { name: "Test Customer" } },
          Order: {
            details: {
              orderID: "ORDER_101",
              payment_type: "Prepaid",
              total: "299.00",
              callback_url: "https://localhost/api/petpooja/order-callback",
              created_on: "2026-03-01 12:00:00",
              order_type: "Delivery",
            },
          },
          OrderItem: { details: [] },
          Tax: { details: [] },
          Discount: { details: [] },
        },
      },
    };

    const res = await client.saveOrder(testPayload);
    expect(res.success).toBe("1");
    expect(res.clientOrderID).toBe("ORDER_101");
    expect(res.orderID).toBe("PETPOOJA_POS_987654");
  });

  it("should classify API error responses accurately", () => {
    const err = PetpoojaError.fromApiResponse(
      { success: "0", message: "Invalid app_key or access_token provided" },
      401
    );
    expect(err.code).toBe("AUTH_ERROR");
    expect(err.isRetryable).toBe(false);

    const storeErr = PetpoojaError.fromApiResponse(
      { success: "0", message: "Store is currently closed or inactive" },
      200
    );
    expect(storeErr.code).toBe("STORE_CLOSED");
  });
});
