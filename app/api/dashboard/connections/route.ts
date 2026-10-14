import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { ShopifyClient } from "@/src/integrations/shopify/shopify.client";
import { PetpoojaClient } from "@/src/integrations/petpooja/petpooja.client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await db.connectedStore.findFirst({ where: { isActive: true } });
    const petpooja = await db.integrationCredential.findFirst({ where: { provider: "PETPOOJA" } });

    return NextResponse.json({
      shopify: {
        shopDomain: store?.shopDomain || process.env.SHOPIFY_SHOP_DOMAIN || "",
        apiVersion: store?.apiVersion || process.env.SHOPIFY_API_VERSION || "2024-04",
        hasAccessToken: Boolean(store?.accessToken || process.env.SHOPIFY_ACCESS_TOKEN),
        hasWebhookSecret: Boolean(store?.webhookSecret || process.env.SHOPIFY_WEBHOOK_SECRET),
        lastConnectedAt: store?.lastConnectedAt,
      },
      petpooja: {
        environment: petpooja?.environment || process.env.PETPOOJA_ENV || "staging",
        restId: petpooja?.restId || process.env.PETPOOJA_REST_ID || "SAMPLE_REST_101",
        appKey: petpooja?.appKey ? `${petpooja.appKey.substring(0, 4)}...${petpooja.appKey.slice(-4)}` : "rps3...7qw4",
        hasAppSecret: Boolean(petpooja?.appSecret || process.env.PETPOOJA_APP_SECRET),
        hasAccessToken: Boolean(petpooja?.accessToken || process.env.PETPOOJA_ACCESS_TOKEN),
        lastTestedAt: petpooja?.lastTestedAt,
        lastTestStatus: petpooja?.lastTestStatus,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch connections", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, provider, data } = body;

    // Test Connections
    if (action === "test") {
      if (provider === "shopify") {
        const domain = data?.shopDomain || process.env.SHOPIFY_SHOP_DOMAIN;
        const token = data?.accessToken || process.env.SHOPIFY_ACCESS_TOKEN;

        if (!domain || !token) {
          return NextResponse.json({ success: false, message: "Shop domain and access token required" });
        }

        const client = new ShopifyClient({ shopDomain: domain, accessToken: token });
        const result = await client.verifyConnection();
        return NextResponse.json(result);
      }

      if (provider === "petpooja") {
        const appKey = data?.appKey || process.env.PETPOOJA_APP_KEY || "rps3igv8ucfhydx01ao6k9ebnz75tqw4";
        const appSecret = data?.appSecret || process.env.PETPOOJA_APP_SECRET || "71b70724b84d8d8ea06fe9cc0da105b07c412228";
        const accessToken = data?.accessToken || process.env.PETPOOJA_ACCESS_TOKEN || "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1";
        const restId = data?.restId || process.env.PETPOOJA_REST_ID || "SAMPLE_REST_101";
        const env = data?.environment || process.env.PETPOOJA_ENV || "staging";

        const client = new PetpoojaClient({
          appKey,
          appSecret,
          accessToken,
          restId,
          env,
        });

        const result = await client.testConnection();

        // Update last test status
        await db.integrationCredential.updateMany({
          where: { provider: "PETPOOJA" },
          data: {
            lastTestedAt: new Date(),
            lastTestStatus: result.success ? "SUCCESS" : "FAILED",
          },
        });

        return NextResponse.json(result);
      }
    }

    // Save Credentials
    if (action === "save") {
      if (provider === "petpooja") {
        const { appKey, appSecret, accessToken, restId, environment } = data;
        const updated = await db.integrationCredential.upsert({
          where: { id: "petpooja_primary" },
          create: {
            id: "petpooja_primary",
            provider: "PETPOOJA",
            environment: environment || "staging",
            appKey,
            appSecret,
            accessToken,
            restId,
            isActive: true,
          },
          update: {
            environment: environment || "staging",
            appKey: appKey || undefined,
            appSecret: appSecret || undefined,
            accessToken: accessToken || undefined,
            restId: restId || undefined,
          },
        });
        return NextResponse.json({ success: true, credentialId: updated.id });
      }

      if (provider === "shopify") {
        const { shopDomain, accessToken, webhookSecret, apiVersion } = data;
        const updated = await db.connectedStore.upsert({
          where: { shopDomain },
          create: {
            shopDomain,
            accessToken,
            webhookSecret,
            apiVersion: apiVersion || "2024-04",
            isActive: true,
          },
          update: {
            accessToken: accessToken || undefined,
            webhookSecret: webhookSecret || undefined,
            apiVersion: apiVersion || undefined,
            lastConnectedAt: new Date(),
          },
        });
        return NextResponse.json({ success: true, storeId: updated.id });
      }
    }

    return NextResponse.json({ error: "Invalid action or provider" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process connection action", details: String(error) }, { status: 500 });
  }
}
