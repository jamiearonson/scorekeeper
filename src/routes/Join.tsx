import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, WifiOff } from "lucide-react";
import { useSync } from "@/lib/sync";
import { Button } from "@/components/ui/button";

// Entry point for a guest joining via code or scanned QR link (`/join/:code`).
// Connects, then hands off to the read-only Play view once the host's state arrives.
export default function Join() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { join, stop, status, remoteGame } = useSync();
  const joined = useRef(false);

  useEffect(() => {
    if (code && !joined.current) {
      joined.current = true;
      join(code);
    }
  }, [code, join]);

  // Once we have the host's game, show it on the Play screen in guest mode.
  useEffect(() => {
    if (remoteGame) navigate("/play", { replace: true });
  }, [remoteGame, navigate]);

  function cancel() {
    stop();
    navigate("/", { replace: true });
  }

  const failed = status === "disconnected";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      {failed ? (
        <>
          <div className="bg-secondary text-muted-foreground flex size-16 items-center justify-center rounded-2xl">
            <WifiOff className="size-8" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Couldn't reach the game</h1>
            <p className="text-muted-foreground mt-1 text-balance text-sm">
              Double-check the code with the scorekeeper and make sure they're still
              sharing.
            </p>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="text-primary size-10 animate-spin" />
          <div>
            <h1 className="text-xl font-semibold">Joining game…</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Connecting to <span className="font-mono font-semibold">{code}</span>
            </p>
          </div>
        </>
      )}

      <Button variant="ghost" onClick={cancel}>
        Cancel
      </Button>
    </div>
  );
}
