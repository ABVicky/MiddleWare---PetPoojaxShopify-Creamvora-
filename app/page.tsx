"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  metrics: {
    totalOrders: number;
    syncedOrders: number;
    queuedOrders: number;
    failedOrders: number;
    needsMappingOrders: number;
    needsReviewOrders: number;
    totalMappings: number;
  };
  health: {
    shopifyConnected: boolean;
    shopifyDomain: string;
    petpoojaConnected: boolean;
    petpoojaEnv: string;
    petpoojaRestId: string;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string | null;
    totalPrice: string;
    currency: string;
    syncStatus: string;
    shopifyCreatedAt: string;
    petpoojaOrder?: {
      petpoojaOrderId: string | null;
      orderStatus: string;
    } | null;
  }>;
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/dashboard/metrics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerQueueProcess = async () => {
    setActionMessage("Dispatching queue worker...");
    try {
      const res = await fetch("/api/cron/process-queue");
      const json = await res.json();
      setActionMessage(`Processed ${json.processed || 0} pending orders.`);
      fetchMetrics();
    } catch {
      setActionMessage("Error triggering queue worker");
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const triggerReconcile = async () => {
    setActionMessage("Running order reconciliation audit...");
    try {
      const res = await fetch("/api/cron/reconcile");
      const json = await res.json();
      setActionMessage(`Reconciled ${json.checked || 0} orders (Recovered: ${json.fixed || 0}).`);
      fetchMetrics();
    } catch {
      setActionMessage("Error during reconciliation");
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          <span>Loading integration overview...</span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalOrders: 0,
    syncedOrders: 0,
    queuedOrders: 0,
    failedOrders: 0,
    needsMappingOrders: 0,
    needsReviewOrders: 0,
    totalMappings: 0,
  };

  const health = data?.health || {
    shopifyConnected: true,
    shopifyDomain: "your-store.myshopify.com",
    petpoojaConnected: true,
    petpoojaEnv: "staging",
    petpoojaRestId: "SAMPLE_REST_101",
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SYNCED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SYNCED</span>;
      case "QUEUED":
      case "PROCESSING":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">QUEUED</span>;
      case "NEEDS_MAPPING":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">NEEDS MAPPING</span>;
      case "NEEDS_REVIEW":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">NEEDS REVIEW</span>;
      case "FAILED":
      case "CANCELLED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/10 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Integration Command Center</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time synchronization between Shopify Store and Petpooja Restaurant POS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerQueueProcess}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>⚡ Process Queue</span>
          </button>
          <button
            onClick={triggerReconcile}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>🔄 Reconcile</span>
          </button>
          <Link
            href="/simulator"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>🧪 Simulate Order</span>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="px-4 py-2.5 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-xs font-medium animate-fadeIn">
          {actionMessage}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-sm">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Orders</div>
          <div className="text-2xl font-bold text-white mt-2">{metrics.totalOrders}</div>
          <div className="text-[11px] text-slate-500 mt-1">Shopify Events</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-emerald-950/50 shadow-sm">
          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Synced to POS</div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{metrics.syncedOrders}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Petpooja Confirmed</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-indigo-950/50 shadow-sm">
          <div className="text-xs font-medium text-indigo-400 uppercase tracking-wider">In Queue</div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">{metrics.queuedOrders}</div>
          <div className="text-[11px] text-indigo-600 mt-1">Awaiting Worker</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-amber-950/50 shadow-sm">
          <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">Needs Mapping</div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{metrics.needsMappingOrders}</div>
          <div className="text-[11px] text-amber-600 mt-1">Unmatched SKUs</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-purple-950/50 shadow-sm">
          <div className="text-xs font-medium text-purple-400 uppercase tracking-wider">Needs Review</div>
          <div className="text-2xl font-bold text-purple-400 mt-2">{metrics.needsReviewOrders}</div>
          <div className="text-[11px] text-purple-600 mt-1">Billing Mismatch</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950 border border-rose-950/50 shadow-sm">
          <div className="text-xs font-medium text-rose-400 uppercase tracking-wider">Failed Orders</div>
          <div className="text-2xl font-bold text-rose-400 mt-2">{metrics.failedOrders}</div>
          <div className="text-[11px] text-rose-600 mt-1">Requires Operator</div>
        </div>
      </div>

      {/* Two Column Section: Connection Cards & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connection Status & Diagnostic */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="font-semibold text-sm text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Connection Status</span>
              <Link href="/connections" className="text-xs text-indigo-400 hover:underline">
                Configure →
              </Link>
            </h3>

            <div className="space-y-4">
              {/* Shopify Box */}
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🛍️</span>
                    <div>
                      <div className="font-semibold text-xs text-white">Shopify Store</div>
                      <div className="text-[11px] text-slate-400">{health.shopifyDomain}</div>
                    </div>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </div>
              </div>

              {/* Petpooja Box */}
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🍽️</span>
                    <div>
                      <div className="font-semibold text-xs text-white">Petpooja POS</div>
                      <div className="text-[11px] text-slate-400">
                        {health.petpoojaEnv.toUpperCase()} • Rest ID: {health.petpoojaRestId}
                      </div>
                    </div>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Catalog Mappings</span>
              <span className="font-semibold text-white">{metrics.totalMappings} items mapped</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-white uppercase tracking-wider">
              Recent Synchronizations
            </h3>
            <Link href="/orders" className="text-xs text-indigo-400 hover:underline">
              View All Orders →
            </Link>
          </div>

          {!data?.recentOrders || data.recentOrders.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">
              No orders processed yet. Click &ldquo;Simulate Order&rdquo; to test the integration!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Order</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Petpooja ID</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-medium">
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 text-white font-mono font-bold">#{order.orderNumber}</td>
                      <td className="py-3 text-slate-300">{order.customerName || "Customer"}</td>
                      <td className="py-3 text-white font-mono">
                        {order.currency} {parseFloat(order.totalPrice).toFixed(2)}
                      </td>
                      <td className="py-3 font-mono text-slate-400">
                        {order.petpoojaOrder?.petpoojaOrderId || "—"}
                      </td>
                      <td className="py-3">{getStatusBadge(order.syncStatus)}</td>
                      <td className="py-3 text-right text-slate-400 font-mono">
                        {new Date(order.shopifyCreatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
