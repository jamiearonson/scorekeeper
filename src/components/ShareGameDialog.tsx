import { useEffect, useState } from "react";
import { Check, Copy, Eye, Pencil, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_CODE_LENGTH,
  MIN_CODE_LENGTH,
  normalizeCode,
  useSync,
} from "@/lib/sync";
import { QrCode } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Begin hosting the moment the panel opens (if not already sharing).
  useEffect(() => {
    if (open && role !== "host") host();
  }, [open, role, host]);

  // Reset the editor whenever the panel closes.
  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  async function copyLink() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(joinUrl(code));
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy — long-press the code instead");
    }
  }

  function startEditing() {
    setDraft(code ?? "");
    setEditing(true);
  }

  function saveCustomCode() {
    const next = normalizeCode(draft);
    if (next.length < MIN_CODE_LENGTH) {
      toast.error(`Use at least ${MIN_CODE_LENGTH} letters or numbers`);
      return;
    }
    host(next); // re-host on the new code (updates the QR + link)
    setEditing(false);
    toast.success(`Now sharing on “${next}”`);
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
            You're the scorekeeper. Others scan the code (or open the link) to watch the
            scoreboard live — no app install needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {code && <QrCode value={joinUrl(code)} size={196} />}

          <div className="w-full text-center">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Game code
            </p>

            {editing ? (
              <div className="mt-1 flex items-center justify-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(normalizeCode(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && saveCustomCode()}
                  autoFocus
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={MAX_CODE_LENGTH}
                  placeholder="PIZZA"
                  className="h-12 max-w-40 text-center font-mono text-xl font-bold tracking-[0.2em] uppercase"
                />
                <Button size="icon" className="size-12 shrink-0" onClick={saveCustomCode} aria-label="Save code">
                  <Check className="size-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-12 shrink-0"
                  onClick={() => setEditing(false)}
                  aria-label="Cancel"
                >
                  <X className="size-5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="mt-0.5 inline-flex items-center gap-2 active:opacity-70"
              >
                <span className="font-mono text-3xl font-bold tracking-[0.25em] break-all">
                  {code ?? "······"}
                </span>
                <Pencil className="text-muted-foreground size-4 shrink-0" />
              </button>
            )}
            {!editing && (
              <p className="text-muted-foreground mt-1 text-xs">
                Tap to set a custom code
              </p>
            )}
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
