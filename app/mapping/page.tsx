"use client";

import { useEffect, useState, useCallback } from "react";

interface ProductMapping {
  id: string;
  shopifyProductId: string | null;
  shopifyVariantId: string;
  shopifySku: string | null;
  shopifyTitle: string;
  shopifyVariantTitle: string | null;
  petpoojaItemId: string;
  petpoojaItemName: string;
  petpoojaVariationId: string | null;
  petpoojaVariationName: string | null;
  status: string;
  lastValidatedAt: string | null;
}

export default function MappingPage() {
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    shopifyVariantId: "",
    shopifyProductId: "",
    shopifySku: "",
    shopifyTitle: "",
    shopifyVariantTitle: "",
    petpoojaItemId: "",
    petpoojaItemName: "",
    petpoojaVariationId: "",
  });

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/mappings?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setMappings(json.mappings || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dashboard/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("Mapping saved successfully!");
        setShowAddModal(false);
        setFormData({
          shopifyVariantId: "",
          shopifyProductId: "",
          shopifySku: "",
          shopifyTitle: "",
          shopifyVariantTitle: "",
          petpoojaItemId: "",
          petpoojaItemName: "",
          petpoojaVariationId: "",
        });
        fetchMappings();
      } else {
        setFeedback(`Failed to save mapping: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`Error: ${String(err)}`);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleBulkCsvImport = async () => {
    try {
      const lines = csvContent.trim().split("\n");
      if (lines.length < 2) {
        setFeedback("CSV must include a header and at least one data row.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const bulkData = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 4) continue;

        bulkData.push({
          shopifyVariantId: cols[0],
          shopifySku: cols[1],
          shopifyTitle: cols[2],
          petpoojaItemId: cols[3],
          petpoojaItemName: cols[4] || cols[2],
          petpoojaVariationId: cols[5] || undefined,
        });
      }

      const res = await fetch("/api/dashboard/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: bulkData }),
      });

      const json = await res.json();
      if (json.success) {
        setFeedback(`Successfully imported ${json.count} product mappings!`);
        setShowCsvModal(false);
        setCsvContent("");
        fetchMappings();
      } else {
        setFeedback(`Bulk import error: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`CSV import failed: ${String(err)}`);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product mapping?")) return;

    try {
      const res = await fetch(`/api/dashboard/mappings?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setFeedback("Mapping deleted successfully.");
        fetchMappings();
      }
    } catch {
      setFeedback("Failed to delete mapping.");
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExportCsv = () => {
    const headers = "shopifyVariantId,shopifySku,shopifyTitle,petpoojaItemId,petpoojaItemName,petpoojaVariationId\n";
    const rows = mappings
      .map(
        (m) =>
          `"${m.shopifyVariantId}","${m.shopifySku || ""}","${m.shopifyTitle}","${m.petpoojaItemId}","${m.petpoojaItemName}","${m.petpoojaVariationId || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `product_mappings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Product & Menu Mapping</h2>
          <p className="text-sm text-slate-400 mt-1">
            Map Shopify variants and SKUs to Petpooja POS menu items to prevent sync failures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search items, SKUs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-52"
          />

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            + Add Mapping
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Mappings Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading product mappings...</div>
        ) : mappings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No product mappings configured yet. Click &ldquo;+ Add Mapping&rdquo; or &ldquo;Import CSV&rdquo; to start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Shopify Product / Variant</th>
                  <th className="py-3 px-4">Shopify SKU</th>
                  <th className="py-3 px-4">Variant ID</th>
                  <th className="py-3 px-4">Petpooja Item Name</th>
                  <th className="py-3 px-4">Petpooja Item ID</th>
                  <th className="py-3 px-4">Variation ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">
                      <div>{m.shopifyTitle}</div>
                      {m.shopifyVariantTitle && (
                        <div className="text-[10px] text-slate-500">{m.shopifyVariantTitle}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{m.shopifySku || "—"}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{m.shopifyVariantId}</td>
                    <td className="py-3 px-4 font-medium text-emerald-400">{m.petpoojaItemName}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{m.petpoojaItemId}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{m.petpoojaVariationId || "—"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 text-[11px]"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Single Mapping Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-4">Link Shopify Item to Petpooja POS</h3>
            <form onSubmit={handleSaveMapping} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Shopify Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Margherita Pizza (10 inch)"
                  value={formData.shopifyTitle}
                  onChange={(e) => setFormData({ ...formData, shopifyTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Shopify Variant ID *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 12345678"
                    value={formData.shopifyVariantId}
                    onChange={(e) => setFormData({ ...formData, shopifyVariantId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Shopify SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. PIZZA-MARG-REG"
                    value={formData.shopifySku}
                    onChange={(e) => setFormData({ ...formData, shopifySku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Petpooja Item Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Margherita Pizza (10 inch)"
                  value={formData.petpoojaItemName}
                  onChange={(e) => setFormData({ ...formData, petpoojaItemName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Petpooja Item ID *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. ITEM_PIZZA_MARGHERITA"
                    value={formData.petpoojaItemId}
                    onChange={(e) => setFormData({ ...formData, petpoojaItemId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Petpooja Variation ID</label>
                  <input
                    type="text"
                    placeholder="optional"
                    value={formData.petpoojaVariationId}
                    onChange={(e) => setFormData({ ...formData, petpoojaVariationId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-2">Bulk CSV Import Mappings</h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste CSV with format: <code className="text-indigo-400">shopifyVariantId,sku,title,petpoojaItemId,petpoojaItemName,variationId</code>
            </p>

            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={`shopifyVariantId,sku,title,petpoojaItemId,petpoojaItemName,variationId
12345678,PIZZA-MARG-REG,Margherita Pizza,ITEM_PIZZA_MARGHERITA,Margherita Pizza,
12345679,SIDES-GARLIC-BRD,Cheesy Garlic Bread,ITEM_GARLIC_BREAD,Cheesy Garlic Bread,`}
              className="w-full p-3 font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCsvImport}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Upload & Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
