"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    autoSyncTrigger: "payment_confirmed",
    requireExactTotalMatch: true,
    allowPartialMappingSync: false,
    defaultOrderType: "Delivery",
    maxRetries: 5,
    enableMockMode: false,
    alertEmail: "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/dashboard/settings");
        if (res.ok) {
          const json = await res.json();
          if (json.settings) {
            setSettings({
              autoSyncTrigger: json.settings.autoSyncTrigger || "payment_confirmed",
              requireExactTotalMatch: json.settings.requireExactTotalMatch ?? true,
              allowPartialMappingSync: json.settings.allowPartialMappingSync ?? false,
              defaultOrderType: json.settings.defaultOrderType || "Delivery",
              maxRetries: json.settings.maxRetries || 5,
              enableMockMode: json.settings.enableMockMode ?? false,
              alertEmail: json.settings.alertEmail || "",
            });
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("✅ Settings saved successfully.");
      } else {
        setFeedback(`❌ Error saving: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`❌ Error: ${String(err)}`);
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Loading integration settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white tracking-tight">Integration Policy & Settings</h2>
        <p className="text-sm text-slate-400 mt-1">
          Define financial verification rules, order eligibility, and retry behaviors.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-lg bg-slate-950 border border-indigo-700/60 text-slate-200 text-xs font-medium">
          {feedback}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Order Eligibility Section */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <h3 className="font-bold text-base text-white">Order Eligibility & Trigger</h3>
          <p className="text-xs text-slate-400">
            Control exactly when a Shopify order is pushed into the Petpooja POS.
          </p>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="radio"
                name="autoSyncTrigger"
                value="payment_confirmed"
                checked={settings.autoSyncTrigger === "payment_confirmed"}
                onChange={(e) => setSettings({ ...settings, autoSyncTrigger: e.target.value })}
                className="mt-1 text-indigo-600 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-xs text-white block">Payment Confirmed or COD (Recommended)</span>
                <span className="text-[11px] text-slate-400">
                  Only synchronizes orders once payment is authorized/paid, or if Cash on Delivery is selected. Unpaid orders stay in Shopify.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="radio"
                name="autoSyncTrigger"
                value="order_created"
                checked={settings.autoSyncTrigger === "order_created"}
                onChange={(e) => setSettings({ ...settings, autoSyncTrigger: e.target.value })}
                className="mt-1 text-indigo-600 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-xs text-white block">Order Created (Immediate)</span>
                <span className="text-[11px] text-slate-400">
                  Pushes to Petpooja POS immediately upon order placement, regardless of payment state.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Financial & Totals Verification */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <h3 className="font-bold text-base text-white">Financial & Billing Integrity</h3>
          <p className="text-xs text-slate-400">
            Guard against rounding discrepancies and tax calculation mismatches.
          </p>

          <div className="space-y-4 pt-2 text-xs">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.requireExactTotalMatch}
                onChange={(e) => setSettings({ ...settings, requireExactTotalMatch: e.target.checked })}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0 h-4 w-4 bg-slate-900"
              />
              <div>
                <span className="font-semibold text-white block">Require Exact Total Match</span>
                <span className="text-[11px] text-slate-400">
                  Holds orders in <code className="text-amber-400">NEEDS_REVIEW</code> if line items + discounts + taxes sum does not match Shopify total.
                </span>
              </div>
            </label>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Default Petpooja Order Type</label>
              <select
                value={settings.defaultOrderType}
                onChange={(e) => setSettings({ ...settings, defaultOrderType: e.target.value })}
                className="w-full md:w-64 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Delivery">Delivery</option>
                <option value="PickUp">PickUp</option>
                <option value="DineIn">DineIn</option>
              </select>
            </div>
          </div>
        </div>

        {/* Retry & Queue Settings */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <h3 className="font-bold text-base text-white">Retry & Recovery Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Maximum Retry Attempts</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxRetries}
                onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Exponential backoff with jitter is applied between attempts.
              </span>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Notification Alert Email</label>
              <input
                type="email"
                placeholder="alerts@myrestaurant.com"
                value={settings.alertEmail}
                onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Receive notifications when an order permanently fails or requires mapping.
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-50"
        >
          {saving ? "Saving Settings..." : "Save All Settings"}
        </button>
      </form>
    </div>
  );
}
