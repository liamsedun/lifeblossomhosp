// ─── PWA platform detection & install helpers ───────────────────
// Client-side only. Import from components; never from server code.

export type InstallPlatform = "android" | "ios" | "mac" | "windows" | "linux" | "unknown";

/** Chrome/Edge on Android or desktop expose beforeinstallprompt; iOS Safari never does. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function getPlatform(): InstallPlatform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  if (/Windows/i.test(ua)) return "windows";
  if (/Linux/i.test(ua)) return "linux";
  return "unknown";
}

export function isIOS(): boolean {
  return getPlatform() === "ios";
}

export function isAndroid(): boolean {
  return getPlatform() === "android";
}

export function isSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|Edg|CriOS|FxiOS/i.test(ua)
  );
}

/** True when running as an installed PWA (standalone window) on any OS. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/** iOS Safari has no beforeinstallprompt; users must use the Share sheet. */
export function isIosSafari(): boolean {
  return isIOS() && isSafari();
}

/** The user is on iOS or macOS Safari, where the browser menu guide applies. */
export function needsBrowserMenuGuide(): boolean {
  return isIosSafari() || (isMac() && isSafari());
}

export function isMac(): boolean {
  return getPlatform() === "mac";
}

/** Browser that fires beforeinstallprompt (Chrome/Edge/Opera — Android & desktop). */
export function supportsBeforeInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return "onbeforeinstallprompt" in window && !isIOS();
}

// ─── Persistence keys ───────────────────────────────────────────

const DISMISS_KEY = "lbh-install-dismissed";
const HIDE_UNTIL_KEY = "lbh-install-hide-until";

/** Remember a dismissal for `days` (default 7); iOS-style guides use 30. */
export function persistInstallDismissal(days = 7): void {
  try {
    localStorage.setItem(DISMISS_KEY, "true");
    localStorage.setItem(HIDE_UNTIL_KEY, String(Date.now() + days * 86_400_000));
  } catch {
    /* storage unavailable — no-op */
  }
}

/** Returns true if a dismiss is still in effect. */
export function isInstallDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const hideUntil = localStorage.getItem(HIDE_UNTIL_KEY);
    if (hideUntil && Date.now() < parseInt(hideUntil, 10)) return true;
    return localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearInstallDismissal(): void {
  try {
    localStorage.removeItem(DISMISS_KEY);
    localStorage.removeItem(HIDE_UNTIL_KEY);
  } catch {
    /* no-op */
  }
}
