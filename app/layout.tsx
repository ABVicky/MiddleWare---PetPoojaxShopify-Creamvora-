import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopify ➔ Petpooja Direct Sync",
  description: "Direct real-time order relay from Shopify to Petpooja POS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center font-bold text-white text-base shadow-md">
              ⚡
            </div>
            <div>
              <span className="font-bold text-sm text-white">Shopify ➔ Petpooja Relay</span>
              <span className="text-[10px] text-slate-400 ml-2 font-mono">v1.0 (Direct Sync)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-emerald-400">Vercel Serverless Ready</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 flex flex-col justify-center">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
          Powered strictly by Shopify Webhooks, Petpooja Online Ordering APIs V2.1.0 & Vercel
        </footer>
      </body>
    </html>
  );
}
