"use client";

import { useEffect, useState } from "react";

export default function DirectSyncStatusPage() {
  const [baseUrl, setBaseUrl] = useState("https://petpooja-middleware.vercel.app");
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(`${baseUrl}/api/webhooks/shopify`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestOrderSync = async () => {
    setTesting(true);
    setTestStatus("Sending direct test order to Petpooja POS...");
    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "inject_webhook", scenario: "standard" }),
      });
      const json = await res.json();
      if (json.success) {
        setTestStatus(`✅ Success! Test Order received and directly synced to Petpooja POS.`);
      } else {
        setTestStatus(`⚠️ Response: ${JSON.stringify(json.response || json)}`);
      }
    } catch (err) {
      setTestStatus(`❌ Error: ${String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      {/* Direct Sync Active Banner */}
      <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/40">
            Direct Real-Time Sync Active
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
          Shopify ➔ Petpooja Direct Order Relay
        </h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Orders placed on your Shopify store are instantly transformed and pushed directly to your Petpooja POS terminal. No manual mapping or dashboard actions required.
        </p>

        {/* Copy Webhook Box */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-300">Your Shopify Webhook URL:</div>
          <div className="flex items-center justify-between gap-2 bg-slate-950 px-4 py-3 rounded-xl border border-slate-800">
            <code className="text-xs md:text-sm font-mono text-emerald-400 break-all">
              {baseUrl}/api/webhooks/shopify
            </code>
            <button
              onClick={copyWebhookUrl}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0 shadow-sm"
            >
              {copied ? "Copied!" : "Copy URL"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Paste this URL in Shopify Admin → <strong>Settings</strong> → <strong>Notifications</strong> → <strong>Webhooks</strong> for <code>Order creation</code>.
          </p>
        </div>

        {/* Instant Test Action */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            Want to test if orders reach Petpooja immediately?
          </div>
          <button
            disabled={testing}
            onClick={handleTestOrderSync}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {testing ? "Sending to Petpooja..." : "⚡ Send Live Test Order to Petpooja"}
          </button>
        </div>

        {testStatus && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-indigo-700/60 text-slate-200 text-xs font-medium animate-fadeIn">
            {testStatus}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="text-2xl">1️⃣</div>
          <div className="font-bold text-white text-sm">Customer Orders</div>
          <div className="text-slate-400 leading-relaxed">
            Customer places an order on your Shopify store via Cash on Delivery, UPI, or Card.
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="text-2xl">2️⃣</div>
          <div className="font-bold text-white text-sm">Instant Relay</div>
          <div className="text-slate-400 leading-relaxed">
            Shopify triggers the webhook. The middleware instantly formats items, taxes, customer address, and payment method.
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="text-2xl">3️⃣</div>
          <div className="font-bold text-white text-sm">Direct to Petpooja POS</div>
          <div className="text-slate-400 leading-relaxed">
            Petpooja&apos;s <code>/save_order</code> API receives the order and it pops up on the cashier screen / KDS kitchen display immediately.
          </div>
        </div>
      </div>
    </div>
  );
}
