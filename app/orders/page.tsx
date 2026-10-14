"use client";

import { useEffect, useState, useCallback } from "react";

interface OrderItem {
  id: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface OrderRecord {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  currency: string;
  totalPrice: string;
  subtotalPrice: string;
  totalDiscounts: string;
  totalShipping: string;
  totalTax: string;
  paymentGateway: string | null;
  financialStatus: string;
  syncStatus: string;
  shopifyCreatedAt: string;
  rawJson: string;
  items: OrderItem[];
  petpoojaOrder?: {
    petpoojaOrderId: string | null;
    orderStatus: string;
    requestPayload: string;
    responsePayload: string | null;
    errorMessage: string | null;
  } | null;
  syncJobs?: Array<{
    id: string;
    state: string;
    attempts: number;
    lastError: string | null;
  }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/dashboard/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

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
        setFeedback(`Order #${shopifyOrderId} retry initiated successfully: ${json.result?.state}`);
        fetchOrders();
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
      case "SYNCED":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SYNCED</span>;
      case "QUEUED":
      case "PROCESSING":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">QUEUED</span>;
      case "NEEDS_MAPPING":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">NEEDS MAPPING</span>;
      case "NEEDS_REVIEW":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">NEEDS REVIEW</span>;
      case "FAILED":
      case "CANCELLED":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">FAILED</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-500/10 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Order Synchronization</h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse ingested Shopify orders, inspect payloads, and manually trigger sync retries.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search order #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="SYNCED">SYNCED</option>
            <option value="QUEUED">QUEUED</option>
            <option value="NEEDS_MAPPING">NEEDS_MAPPING</option>
            <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2"></div>
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No orders found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Petpooja POS ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {orders.map((order) => {
                  const job = order.syncJobs?.[0];
                  return (
                    <tr key={order.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div>{order.customerName || "Customer"}</div>
                        <div className="text-[10px] text-slate-500">{order.customerEmail || "—"}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-white">
                        {order.currency} {parseFloat(order.totalPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <span className="capitalize">{order.paymentGateway || order.financialStatus}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {order.petpoojaOrder?.petpoojaOrderId || "—"}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(order.syncStatus)}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(order.shopifyCreatedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          Inspect
                        </button>
                        {order.syncStatus !== "SYNCED" && (
                          <button
                            disabled={retryingId === order.shopifyOrderId}
                            onClick={() => handleRetry(order.shopifyOrderId)}
                            className="px-2.5 py-1 text-[11px] rounded bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50"
                          >
                            {retryingId === order.shopifyOrderId ? "..." : "Retry"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail / Inspector Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">
                  Order #{selectedOrder.orderNumber} Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Shopify Order ID: {selectedOrder.shopifyOrderId} • Created:{" "}
                  {new Date(selectedOrder.shopifyCreatedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Financial Breakdown */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
                  Financial Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Subtotal</span>
                    <span className="text-white font-bold">{selectedOrder.currency} {selectedOrder.subtotalPrice}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Discounts</span>
                    <span className="text-emerald-400 font-bold">-{selectedOrder.currency} {selectedOrder.totalDiscounts}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Shipping</span>
                    <span className="text-white font-bold">{selectedOrder.currency} {selectedOrder.totalShipping}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Taxes (GST)</span>
                    <span className="text-white font-bold">{selectedOrder.currency} {selectedOrder.totalTax}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Total Amount</span>
                    <span className="text-indigo-400 font-bold">{selectedOrder.currency} {selectedOrder.totalPrice}</span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-2">
                  Line Items ({selectedOrder.items.length})
                </h4>
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-2.5">Title</th>
                        <th className="p-2.5">SKU</th>
                        <th className="p-2.5">Qty</th>
                        <th className="p-2.5">Unit Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id} className="text-slate-300">
                          <td className="p-2.5 font-medium text-white">{item.title}</td>
                          <td className="p-2.5 font-mono text-slate-400">{item.sku || "—"}</td>
                          <td className="p-2.5 font-mono">{item.quantity}</td>
                          <td className="p-2.5 font-mono">{selectedOrder.currency} {item.unitPrice}</td>
                          <td className="p-2.5 text-right font-mono text-white">{selectedOrder.currency} {item.totalPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Petpooja Sync Information */}
              {selectedOrder.petpoojaOrder && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    Petpooja POS Sync Data
                  </h4>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Petpooja Order ID</span>
                      <span className="text-white font-bold">{selectedOrder.petpoojaOrder.petpoojaOrderId || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">POS Status</span>
                      <span className="text-emerald-400 font-bold">{selectedOrder.petpoojaOrder.orderStatus}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* JSON Inspector Tabs */}
              <div>
                <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-2">
                  Raw Shopify JSON Payload
                </h4>
                <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono max-h-48 overflow-y-auto">
                  {JSON.stringify(JSON.parse(selectedOrder.rawJson), null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Sync Status: <span className="font-bold text-white">{selectedOrder.syncStatus}</span>
              </span>
              <div className="space-x-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Close
                </button>
                {selectedOrder.syncStatus !== "SYNCED" && (
                  <button
                    disabled={retryingId === selectedOrder.shopifyOrderId}
                    onClick={() => handleRetry(selectedOrder.shopifyOrderId)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    {retryingId === selectedOrder.shopifyOrderId ? "Retrying..." : "Retry Sync to Petpooja"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
