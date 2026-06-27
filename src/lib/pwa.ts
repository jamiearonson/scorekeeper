// Helpers for detecting install / standalone state across platforms.

/** True when the app is launched from the home screen (installed PWA), not a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari exposes navigator.standalone instead of display-mode.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return Boolean(mql || iosStandalone);
}

/** iOS (incl. iPadOS, which masquerades as Mac but reports touch points). */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iphone|ipad|ipod/i.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

/** The non-standard event Chromium fires when the app is installable. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
