import { useEffect, useRef } from "react";
import { useGame } from "@/lib/store";
import { upsertGame } from "@/lib/persistence";

// Mirrors the active local game into Supabase, debounced. Renders nothing.
// Only the owner's local game is observed — a guest watching a synced game never persists
// it (that's the host's game). Clearing the active game does NOT delete the saved row.
const DEBOUNCE_MS = 800;

export function GameSync() {
  const { game } = useGame();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!game) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void upsertGame(game);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [game]);

  return null;
}
