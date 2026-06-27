import { useEffect } from "react";

// Keep the phone screen from sleeping while a game is on screen. Uses the Screen
// Wake Lock API where available (Chrome/Edge/Safari 16.4+); a no-op elsewhere.
// The lock is auto-released by the browser when the tab is hidden, so we re-acquire
// it when the page becomes visible again.
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    const wakeLock = (navigator as Navigator & {
      wakeLock: { request: (type: "screen") => Promise<WakeLockSentinel> };
    }).wakeLock;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || sentinel || document.visibilityState !== "visible") return;
      try {
        sentinel = await wakeLock.request("screen");
        sentinel.addEventListener("release", () => {
          sentinel = null;
        });
      } catch {
        /* denied / low battery / unsupported — fine to ignore */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
