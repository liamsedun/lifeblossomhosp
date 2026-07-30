"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

export default function InstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative rounded-2xl bg-card border border-border p-4 shadow-xl card-shadow">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 text-text-secondary hover:text-foreground"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white text-sm font-bold">
            LB
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Install Life Blossom
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Get faster access and offline support.
            </p>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors shrink-0">
            <Download size={14} />
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
