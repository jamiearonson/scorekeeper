import { useEffect } from "react";
import { Copy, Eye, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useSync } from "@/lib/sync";
import { QrCode } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShareGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function joinUrl(code: string): string {
  return `${location.origin}${location.pathname}#/join/${code}`;
}

// Host-side panel: start sharing, show the code + QR, and live watcher count.
export function ShareGameDialog({ open, onOpenChange }: ShareGameDialogProps) {
  const { role, code, peerCount, host, stop } = useSync();

  // Begin hosting the moment the panel opens (if not already sharing).
  useEffect(() => {
    if (open && role !== "host") host();
  }, [open, role, host]);

  async function copyLink() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(joinUrl(code));
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy — long-press the code instead");
    }
  }

  function stopSharing() {
    stop();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[22rem]">
        <DialogHeader>
          <DialogTitle>Share this game</DialogTitle>
          <DialogDescription>
            Others scan the code (or open the link) to watch the score live. No app
            install needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {code && <QrCode value={joinUrl(code)} size={196} />}

          <div className="text-center">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Game code
            </p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em]">
              {code ?? "······"}
            </p>
          </div>

          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Eye className="size-4" />
            {peerCount === 0
              ? "Waiting for players to join…"
              : `${peerCount} ${peerCount === 1 ? "person" : "people"} watching`}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={copyLink} variant="outline" className="h-11">
            <Copy className="size-4" />
            Copy invite link
          </Button>
          <Button onClick={stopSharing} variant="ghost" className="text-muted-foreground">
            <WifiOff className="size-4" />
            Stop sharing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
