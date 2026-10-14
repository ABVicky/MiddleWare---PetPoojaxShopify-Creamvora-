import { logger } from "@/src/lib/logger";

export interface ShopifyClientConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface WebhookSubscription {
  id: string;
  topic: string;
  address: string;
  format: string;
}

export class ShopifyClient {
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(config: ShopifyClientConfig) {
    this.shopDomain = config.shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || process.env.SHOPIFY_API_VERSION || "2024-04";
  }

  private get baseUrl(): string {
    return `https://${this.shopDomain}/admin/api/${this.apiVersion}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
        ...options.headers,
      },
    });

    const callLimit = response.headers.get("X-Shopify-Shop-Api-Call-Limit");
    if (callLimit) {
      logger.debug("Shopify API Rate Limit", { callLimit, shopDomain: this.shopDomain });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API Error (${response.status} ${response.statusText}): ${errorText}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Diagnostic check to verify Shopify shop credentials and permissions.
   */
  async verifyConnection(): Promise<{ success: boolean; shopName?: string; email?: string; error?: string }> {
    try {
      const data = await this.request<{ shop: { name: string; email: string; domain: string } }>("/shop.json");
      return {
        success: true,
        shopName: data.shop.name,
        email: data.shop.email,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Lists existing webhook subscriptions for this store.
   */
  async listWebhooks(): Promise<WebhookSubscription[]> {
    const data = await this.request<{ webhooks: WebhookSubscription[] }>("/webhooks.json");
    return data.webhooks || [];
  }

  /**
   * Registers a webhook topic pointing to the specified callback address.
   */
  async createWebhook(topic: string, address: string): Promise<WebhookSubscription> {
    const data = await this.request<{ webhook: WebhookSubscription }>("/webhooks.json", {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          topic,
          address,
          format: "json",
        },
      }),
    });
    return data.webhook;
  }

  /**
   * Deletes a registered webhook subscription.
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    await this.request(`/webhooks/${webhookId}.json`, { method: "DELETE" });
    return true;
  }
}
