"use client";

import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  correlationId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: string;
  detailsJson: string | null;
  createdAt: string;
}

interface SyncAttempt {
  id: string;
  attemptNumber: number;
  state: string;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  syncJob: {
    shopifyOrder: {
      orderNumber: string;
      currency: string;
      totalPrice: string;
    };
  };
}

export default function LogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [syncAttempts, setSyncAttempts] = useState<SyncAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"attempts" | "audit">("attempts");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/logs?limit=50");
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.auditLogs || []);
        setSyncAttempts(json.syncAttempts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Logs & Audit Trail</h2>
          <p className="text-sm text-slate-400 mt-1">
            Redacted audit records, sync attempt histories, and Petpooja POS communication logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("attempts")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "attempts"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sync Attempts
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "audit"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Audit Trail
            </button>
          </div>
          <button
            onClick={fetchLogs}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading logs...</div>
        ) : activeTab === "attempts" ? (
          syncAttempts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No sync attempts recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Attempt #</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Message / Error</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono">
                  {syncAttempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        #{att.syncJob?.shopifyOrder?.orderNumber || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-300">Attempt {att.attemptNumber}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            att.state === "SYNCED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {att.state}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{att.durationMs || 0}ms</td>
                      <td className="py-3 px-4 text-slate-300 max-w-sm truncate text-[11px]">
                        {att.errorMessage || "Order successfully synced to Petpooja"}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {new Date(att.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-400">{log.action}</td>
                    <td className="py-3 px-4 text-slate-300">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-400">{log.actor}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-sm truncate text-[11px]">
                      {log.detailsJson || "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
