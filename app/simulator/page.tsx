"use client";

import { useState } from "react";

export default function SimulatorPage() {
  const [scenario, setScenario] = useState("standard");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState<"petpooja" | "billing" | "shopify">("petpooja");

  const runSimulation = async (action: "dry_run" | "inject_webhook" | "test_petpooja_mock") => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, scenario }),
      });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ error: "Simulator request failed", details: String(err) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white tracking-tight">Interactive Integration Simulator</h2>
        <p className="text-sm text-slate-400 mt-1">
          Test order normalization, product mapping, and Petpooja Online Ordering API transformations.
        </p>
      </div>

      {/* Scenario Selector & Action Bar */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-white uppercase tracking-wider">Choose Test Scenario</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <button
            type="button"
            onClick={() => setScenario("standard")}
            className={`p-3 rounded-xl border text-left transition-all ${
              scenario === "standard"
                ? "bg-indigo-950/60 border-indigo-500 text-white shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <span className="font-bold block mb-1">🍕 Standard Paid Order</span>
            <span className="text-[11px] text-slate-400">Regular prepaid pizza + garlic bread order</span>
          </button>

          <button
            type="button"
            onClick={() => setScenario("cod")}
            className={`p-3 rounded-xl border text-left transition-all ${
              scenario === "cod"
                ? "bg-indigo-950/60 border-indigo-500 text-white shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <span className="font-bold block mb-1">💵 Cash On Delivery (COD)</span>
            <span className="text-[11px] text-slate-400">Payment method set to COD with cash collection</span>
          </button>

          <button
            type="button"
            onClick={() => setScenario("discounted")}
            className={`p-3 rounded-xl border text-left transition-all ${
              scenario === "discounted"
                ? "bg-indigo-950/60 border-indigo-500 text-white shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <span className="font-bold block mb-1">🏷️ Order With Discount</span>
            <span className="text-[11px] text-slate-400">Applies coupons & line-item discount validation</span>
          </button>

          <button
            type="button"
            onClick={() => setScenario("unmapped")}
            className={`p-3 rounded-xl border text-left transition-all ${
              scenario === "unmapped"
                ? "bg-amber-950/60 border-amber-500 text-white shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <span className="font-bold block mb-1">⚠️ Unmapped Product</span>
            <span className="text-[11px] text-slate-400">Verifies safety hold in NEEDS_MAPPING state</span>
          </button>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3">
          <button
            disabled={running}
            onClick={() => runSimulation("dry_run")}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {running ? "Simulating..." : "🔍 Inspect Transformation (Dry Run)"}
          </button>
          <button
            disabled={running}
            onClick={() => runSimulation("inject_webhook")}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            📥 Ingest Simulated Webhook Event
          </button>
          <button
            disabled={running}
            onClick={() => runSimulation("test_petpooja_mock")}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            🍽️ Test Petpooja POS Order Push
          </button>
        </div>
      </div>

      {/* Simulator Results & Inspection View */}
      {result && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white">Simulation Results</h3>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab("petpooja")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "petpooja" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Petpooja V2.1.0 Payload
              </button>
              <button
                onClick={() => setActiveTab("billing")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "billing" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Financial Breakdown
              </button>
              <button
                onClick={() => setActiveTab("shopify")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "shopify" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Shopify Webhook Input
              </button>
            </div>
          </div>

          {activeTab === "petpooja" && (
            <div>
              <p className="text-xs text-slate-400 mb-2">
                This exact JSON is sent to Petpooja Online Ordering API (<code>POST .../V1/save_order</code>):
              </p>
              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96">
                {JSON.stringify(result.petpoojaPayload || result.response || result, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
              <pre className="text-slate-300">
                {JSON.stringify(result.billing || result, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === "shopify" && (
            <div>
              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-96">
                {JSON.stringify(result.sampleOrder || result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
