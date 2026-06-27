import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isIos,
  isStandalone,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

const DISMISS_KEY = "scorekeeper:v1:installDismissed";

/**
 * Shown only when the app is running in a browser tab (not installed).
 * - Chromium: offers a native install button via the captured beforeinstallprompt.
 * - iOS Safari: shows the manual "Share → Add to Home Screen" steps (no native prompt).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to do
    if (localStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop Chrome's mini-infobar; we drive the prompt ourselves
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt, so surface the manual instructions.
    if (isIos()) setShow(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (dismissed || !show || isStandalone()) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferred(null);
  }

  const ios = isIos() && !deferred;

  return (
    <div className="border-primary/30 bg-primary/5 relative flex flex-col gap-3 rounded-xl border p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-muted-foreground absolute right-2 top-2 p-1"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-3 pr-6">
        <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Download className="size-5" />
        </div>
        <div>
          <p className="font-semibold leading-tight">Add to your home screen</p>
          <p className="text-muted-foreground text-sm leading-snug">
            Install Scorekeeper for a fullscreen, offline-ready app.
          </p>
        </div>
      </div>

      {ios ? (
        <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
          Tap
          <Share className="text-foreground inline size-4" aria-label="the Share button" />
          <span className="text-foreground font-medium">Share</span>, then
          <SquarePlus
            className="text-foreground inline size-4"
            aria-label="Add to Home Screen"
          />
          <span className="text-foreground font-medium">Add to Home Screen</span>.
        </p>
      ) : (
        <Button onClick={install} className={cn("h-11 w-full")}>
          <Download className="size-4" />
          Install app
        </Button>
      )}
    </div>
  );
}
