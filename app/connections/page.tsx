"use client";

import { useEffect, useState } from "react";

export default function ConnectionsPage() {
  const [loading, setLoading] = useState(true);
  const [testingPetpooja, setTestingPetpooja] = useState(false);
  const [testingShopify, setTestingShopify] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [petpoojaConfig, setPetpoojaConfig] = useState({
    environment: "staging",
    appKey: "rps3igv8ucfhydx01ao6k9ebnz75tqw4",
    appSecret: "71b70724b84d8d8ea06fe9cc0da105b07c412228",
    accessToken: "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1",
    restId: "SAMPLE_REST_101",
  });

  const [shopifyConfig, setShopifyConfig] = useState({
    shopDomain: "your-store.myshopify.com",
    webhookSecret: "",
  });

  const [baseUrl, setBaseUrl] = useState("https://petpooja-middleware.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }

    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/dashboard/connections");
        if (res.ok) {
          const json = await res.json();
          if (json.shopify) {
            setShopifyConfig({
              shopDomain: json.shopify.shopDomain || "your-store.myshopify.com",
              webhookSecret: json.shopify.hasWebhookSecret ? "••••••••••••••••" : "",
            });
          }
          if (json.petpooja) {
            setPetpoojaConfig({
              environment: json.petpooja.environment || "staging",
              appKey: "rps3igv8ucfhydx01ao6k9ebnz75tqw4",
              appSecret: "71b70724b84d8d8ea06fe9cc0da105b07c412228",
              accessToken: "7337c1365cf2e61fe5f2b9f8d445db00dc6c39a1",
              restId: json.petpooja.restId || "SAMPLE_REST_101",
            });
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleTestPetpooja = async () => {
    setTestingPetpooja(true);
    try {
      const res = await fetch("/api/dashboard/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          provider: "petpooja",
          data: petpoojaConfig,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("✅ Petpooja API Connection Successful! Catalog and credentials verified.");
      } else {
        setFeedback(`❌ Petpooja Connection Error: ${json.message}`);
      }
    } catch (err) {
      setFeedback(`❌ Petpooja Test Failed: ${String(err)}`);
    } finally {
      setTestingPetpooja(false);
    }
  };

  const handleSavePetpooja = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dashboard/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          provider: "petpooja",
          data: petpoojaConfig,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("✅ Petpooja credentials saved successfully.");
      } else {
        setFeedback(`❌ Error saving: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`❌ Error: ${String(err)}`);
    }
  };

  const handleSaveShopify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dashboard/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          provider: "shopify",
          data: shopifyConfig,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("✅ Shopify webhook secret saved successfully.");
      } else {
        setFeedback(`❌ Error saving: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`❌ Error: ${String(err)}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white tracking-tight">Platform Connections</h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure Shopify webhook ingestion and Petpooja Online Ordering API credentials.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-lg bg-slate-950 border border-indigo-700/60 text-slate-200 text-xs font-medium shadow-md">
          {feedback}
        </div>
      )}

      {/* Two Column Grid: Shopify Webhooks & Petpooja POS API */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shopify Webhook Configuration */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛍️</span>
              <div>
                <h3 className="font-bold text-base text-white">Shopify Webhooks Connection</h3>
                <p className="text-xs text-slate-400">Connected strictly via HMAC-verified HTTP webhooks</p>
              </div>
            </div>

            {/* Ingestion URL Callout */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                Shopify Webhook Target URL
              </div>
              <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                <code className="text-xs font-mono text-emerald-400">{baseUrl}/api/webhooks/shopify</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${baseUrl}/api/webhooks/shopify`);
                    setFeedback("Copied Shopify Webhook URL to clipboard!");
                    setTimeout(() => setFeedback(null), 3000);
                  }}
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Copy
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Add this URL in Shopify Admin → <strong>Settings</strong> → <strong>Notifications</strong> → <strong>Webhooks</strong>.
                Subscribe to: <code className="text-slate-300">orders/create</code>, <code className="text-slate-300">orders/updated</code>, and <code className="text-slate-300">orders/cancelled</code> (Format: JSON).
              </p>
            </div>

            <form onSubmit={handleSaveShopify} className="space-y-4 text-xs pt-2">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Shopify Store Domain</label>
                <input
                  type="text"
                  placeholder="e.g. my-food-store.myshopify.com"
                  value={shopifyConfig.shopDomain}
                  onChange={(e) => setShopifyConfig({ ...shopifyConfig, shopDomain: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Shopify Webhook Signing Secret</label>
                <input
                  type="password"
                  placeholder="Found at the bottom of Shopify Webhooks page"
                  value={shopifyConfig.webhookSecret}
                  onChange={(e) => setShopifyConfig({ ...shopifyConfig, webhookSecret: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used to verify the <code className="text-slate-400">X-Shopify-Hmac-Sha256</code> header.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                >
                  Save Shopify Webhook Config
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Petpooja POS API Configuration */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍽️</span>
                <div>
                  <h3 className="font-bold text-base text-white">Petpooja Online Ordering API</h3>
                  <p className="text-xs text-slate-400">Online Ordering APIs V2.1.0 (AWS API Gateway)</p>
                </div>
              </div>

              <button
                type="button"
                disabled={testingPetpooja}
                onClick={handleTestPetpooja}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                {testingPetpooja ? "Testing..." : "Test Petpooja API"}
              </button>
            </div>

            <form onSubmit={handleSavePetpooja} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Environment</label>
                  <select
                    value={petpoojaConfig.environment}
                    onChange={(e) => setPetpoojaConfig({ ...petpoojaConfig, environment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="mock">Mock Mode (Offline Simulation)</option>
                    <option value="staging">Staging (Sandbox)</option>
                    <option value="production">Production (Live POS)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Restaurant ID (restID) *</label>
                  <input
                    required
                    type="text"
                    value={petpoojaConfig.restId}
                    onChange={(e) => setPetpoojaConfig({ ...petpoojaConfig, restId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">App Key *</label>
                <input
                  required
                  type="text"
                  value={petpoojaConfig.appKey}
                  onChange={(e) => setPetpoojaConfig({ ...petpoojaConfig, appKey: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">App Secret *</label>
                <input
                  required
                  type="password"
                  value={petpoojaConfig.appSecret}
                  onChange={(e) => setPetpoojaConfig({ ...petpoojaConfig, appSecret: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Access Token *</label>
                <input
                  required
                  type="password"
                  value={petpoojaConfig.accessToken}
                  onChange={(e) => setPetpoojaConfig({ ...petpoojaConfig, accessToken: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
                >
                  Save Petpooja API Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Petpooja Developer Portal Setup Guide Card */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-white">Petpooja Developer Portal Configuration Reference</h3>
        <p className="text-xs text-slate-400">
          In your Petpooja Developer Portal (<code>developerapi.petpooja.com/developers/configuration/</code>), set your Base URL to:
          <code className="text-indigo-400 ml-1 font-mono">{baseUrl}</code> and copy these verified endpoint paths:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Menu Sharing Endpoint:</span>
            <span className="text-emerald-400 font-bold">/api/petpooja/menu-push</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Get Store Status API Endpoint:</span>
            <span className="text-emerald-400 font-bold">/api/petpooja/get-status</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Update Store Status API Endpoint:</span>
            <span className="text-emerald-400 font-bold">/api/petpooja/update-status</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Item Off API Endpoint:</span>
            <span className="text-emerald-400 font-bold">/api/petpooja/item-off</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Item On API Endpoint:</span>
            <span className="text-emerald-400 font-bold">/api/petpooja/item-on</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Order Status Callback URL:</span>
            <span className="text-emerald-400 font-bold">/api/petpooja/order-callback</span>
          </div>
        </div>
      </div>
    </div>
  );
}
