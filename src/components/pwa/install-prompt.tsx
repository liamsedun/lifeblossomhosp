"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, X, Share, Plus, Check, Smartphone } from "lucide-react";
import {
  type BeforeInstallPromptEvent,
  isIosSafari,
  isStandalone,
  supportsBeforeInstallPrompt,
  persistInstallDismissal,
  isInstallDismissed,
  clearInstallDismissal,
} from "@/lib/pwa";

const IOS_DISMISS_DAYS = 30;
const ANDROID_DISMISS_DAYS = 7;

// ─── Android / desktop Chrome & Edge banner ─────────────────────
// Uses the captured beforeinstallprompt event so the browser shows
// its native install dialog (Chrome/Edge on Android & desktop).
function AndroidBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!supportsBeforeInstallPrompt() || isStandalone() || isInstallDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      clearInstallDismissal();
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    if (choice.outcome === "accepted") clearInstallDismissal();
  }, [deferred]);

  if (!visible || dismissed || isStandalone()) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0d1322]/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4c81] to-[#1a6cb0] shadow-lg shadow-[#0f4c81]/30">
          <Download className="h-5 w-5 text-[#e0a84a]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Install Life Blossom</p>
          <p className="text-xs text-white/50">Get instant access &amp; offline support.</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-gradient-to-br from-[#e0a84a] to-amber-500 px-4 py-2 text-xs font-semibold text-[#0a0f1a] shadow-lg shadow-[#e0a84a]/25 transition-all hover:brightness-105 active:scale-[0.97]"
        >
          Install
        </button>
        <button
          onClick={() => {
            setDismissed(true);
            persistInstallDismissal(ANDROID_DISMISS_DAYS);
          }}
          className="shrink-0 rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          aria-label="Not now"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── iOS Safari guide modal ─────────────────────────────────────
// iOS has no beforeinstallprompt; guide the user through the Share sheet.
const IOS_STEPS = [
  { icon: Share, label: "Tap the Share button in the Safari toolbar" },
  { icon: Plus, label: "Scroll down and tap \u201CAdd to Home Screen\u201D" },
  { icon: Check, label: "Tap \u201CAdd\u201D — Life Blossom is now an app" },
];

function IosGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafari() || isStandalone() || isInstallDismissed()) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm animate-in zoom-in-95 fade-in duration-200 rounded-3xl border border-white/[0.08] bg-[#0d1322] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4c81] to-[#1a6cb0] text-sm font-bold text-[#e0a84a] shadow-lg shadow-[#0f4c81]/30">
              LB
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Install Life Blossom</p>
              <p className="text-[11px] text-white/50">Add to your home screen</p>
            </div>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              persistInstallDismissal(IOS_DISMISS_DAYS);
            }}
            className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {IOS_STEPS.map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                <Icon className="h-4 w-4 text-[#e0a84a]" />
              </div>
              <p className="text-xs leading-relaxed text-white/70">
                <span className="mr-1 font-bold text-[#e0a84a]">{i + 1}.</span>
                {label}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            setVisible(false);
            persistInstallDismissal(IOS_DISMISS_DAYS);
          }}
          className="mt-6 w-full rounded-xl bg-gradient-to-br from-[#e0a84a] to-amber-500 py-3 text-sm font-bold text-[#0a0f1a] shadow-lg shadow-[#e0a84a]/25 transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ─── iOS installed hint (offline-capable) ───────────────────────
function IosInstalledHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafari() || !isStandalone() || isInstallDismissed()) return;
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[60] mx-auto max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0d1322]/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4c81] to-[#1a6cb0]">
          <Smartphone className="h-5 w-5 text-[#e0a84a]" />
        </div>
        <p className="flex-1 text-xs leading-relaxed text-white/70">
          Installed! Life Blossom now works like an app and supports offline viewing.
        </p>
        <button
          onClick={() => {
            setVisible(false);
            persistInstallDismissal(IOS_DISMISS_DAYS);
          }}
          className="shrink-0 rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────

export default function InstallPrompt() {
  return (
    <>
      <AndroidBanner />
      <IosGuide />
      <IosInstalledHint />
    </>
  );
}

export { AndroidBanner as InstallBanner, IosGuide };
