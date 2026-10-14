import { describe, it, expect } from "vitest";
import { PetpoojaClient } from "@/src/integrations/petpooja/petpooja.client";
import { PetpoojaError } from "@/src/integrations/petpooja/petpooja.errors";

describe("Petpooja API Client & Mock Adapter", () => {
  const client = new PetpoojaClient({
    appKey: "test_key",
    appSecret: "test_secret",
    accessToken: "test_token",
    restId: "REST_101",
    env: "mock",
  });

  it("should successfully process order push in mock mode", async () => {
    const mockPayload = {
      app_key: "test_key",
      app_secret: "test_secret",
      access_token: "test_token",
      orderinfo: {
        OrderInfo: {
          Restaurant: { details: { restID: "REST_101" } },
          Customer: { details: { name: "Test Customer" } },
          Order: {
            details: {
              orderID: "MOCK_ORDER_101",
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

    const res = await client.saveOrder(mockPayload);
    expect(res.success).toBe("1");
    expect(res.clientOrderID).toBe("MOCK_ORDER_101");
    expect(res.orderID).toContain("MOCK_POS_");
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
