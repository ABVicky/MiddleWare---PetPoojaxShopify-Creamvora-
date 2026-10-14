"use client";

import { useEffect, useState, useCallback } from "react";

interface FailedOrder {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerName: string | null;
  totalPrice: string;
  currency: string;
  syncStatus: string;
  shopifyCreatedAt: string;
  syncJobs: Array<{
    id: string;
    attempts: number;
    maxAttempts: number;
    lastError: string | null;
    state: string;
    nextRunAt: string;
  }>;
}

export default function FailedJobsPage() {
  const [orders, setOrders] = useState<FailedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchFailedOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/orders?limit=50");
      if (res.ok) {
        const json = await res.json();
        const filtered = (json.orders || []).filter(
          (o: FailedOrder) =>
            o.syncStatus === "FAILED" ||
            o.syncStatus === "NEEDS_MAPPING" ||
            o.syncStatus === "NEEDS_REVIEW" ||
            o.syncStatus === "RETRY_PENDING"
        );
        setOrders(filtered);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFailedOrders();
  }, [fetchFailedOrders]);

  const handleRetry = async (shopifyOrderId: string) => {
    setRetryingId(shopifyOrderId);
    try {
      const res = await fetch("/api/dashboard/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", shopifyOrderId }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`Order #${shopifyOrderId} retry initiated: ${json.result?.state}`);
        fetchFailedOrders();
      } else {
        setFeedback(`Retry failed: ${json.error || json.result?.errorMessage}`);
      }
    } catch (err) {
      setFeedback(`Error retrying: ${String(err)}`);
    } finally {
      setRetryingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEEDS_MAPPING":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">NEEDS MAPPING</span>;
      case "NEEDS_REVIEW":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">NEEDS REVIEW</span>;
      case "RETRY_PENDING":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">RETRY PENDING</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">FAILED</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Failed Jobs & Review Queue</h2>
          <p className="text-sm text-slate-400 mt-1">
            Orders that encountered mapping issues, billing discrepancy, or Petpooja API errors.
          </p>
        </div>
        <button
          onClick={fetchFailedOrders}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading failed jobs...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            🎉 No failed orders or items requiring review! All orders are synchronized.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Error / Reason</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {orders.map((o) => {
                  const job = o.syncJobs?.[0];
                  return (
                    <tr key={o.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">#{o.orderNumber}</td>
                      <td className="py-3 px-4 text-slate-300">{o.customerName || "Customer"}</td>
                      <td className="py-3 px-4 font-mono text-white">
                        {o.currency} {parseFloat(o.totalPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(o.syncStatus)}</td>
                      <td className="py-3 px-4 text-rose-300/90 max-w-xs truncate font-mono text-[11px]">
                        {job?.lastError || "Awaiting review or mapping resolution"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {job?.attempts || 0} / {job?.maxAttempts || 5}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          disabled={retryingId === o.shopifyOrderId}
                          onClick={() => handleRetry(o.shopifyOrderId)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {retryingId === o.shopifyOrderId ? "Retrying..." : "Retry Sync"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
