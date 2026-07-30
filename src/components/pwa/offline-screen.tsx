"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflineScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-danger-light">
        <WifiOff className="h-10 w-10 text-danger" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-foreground">You Are Offline</h2>
      <p className="mt-2 max-w-xs text-sm text-text-secondary leading-relaxed">
        No internet connection. Some features may be unavailable until you are
        back online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-light active:scale-[0.97]"
      >
        <RefreshCw size={16} />
        Try Again
      </button>
    </div>
  );
}
