import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopify ↔ Petpooja POS Middleware",
  description: "Enterprise order synchronization and product mapping middleware for Shopify and Petpooja POS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-slate-900 text-slate-100">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col justify-between">
          <div>
            {/* Brand Logo & Header */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-rose-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/20">
                ⚡
              </div>
              <div>
                <h1 className="font-bold text-sm leading-tight text-white tracking-wide">SyncEngine POS</h1>
                <p className="text-[11px] text-slate-400">Shopify ↔ Petpooja</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="p-4 space-y-1 text-sm font-medium">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <span className="text-base">📊</span>
                <span>Overview</span>
              </Link>
              <Link
                href="/orders"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <span className="text-base">📦</span>
                <span>Orders</span>
              </Link>
              <Link
                href="/mapping"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <span className="text-base">🏷️</span>
                <span>Product Mapping</span>
              </Link>
              <Link
                href="/failed-jobs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <span className="text-base">⚠️</span>
                <span>Failed & Review</span>
              </Link>
              <Link
                href="/connections"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <span className="text-base">🔌</span>
                <span>Connections</span>
              </Link>
              <Link
                href="/simulator"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors"
              >
                <span className="text-base">🧪</span>
                <span>Test Simulator</span>
              </Link>
              <Link
                href="/logs"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <span className="text-base">📜</span>
                <span>Audit Logs</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <span className="text-base">⚙️</span>
                <span>Settings</span>
              </Link>
            </nav>
          </div>

          {/* System Footer info */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Vercel Serverless</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">v1.0.0</span>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 border-b border-slate-800 bg-slate-950/60 backdrop-blur px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                ● Shopify: Connected
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/50">
                ● Petpooja: Staging Active
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/simulator"
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>🧪 Test Order Simulator</span>
              </Link>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto p-8 bg-slate-900/90">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
