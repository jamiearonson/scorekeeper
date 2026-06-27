import { Crown } from "lucide-react";
import type { Game } from "@/lib/types";
import { standings } from "@/lib/scoring";
import { cn } from "@/lib/utils";

// Compact, horizontally scrollable standings strip shown above the scorecard.
export function Leaderboard({ game }: { game: Game }) {
  const rows = standings(game);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {rows.map((s) => (
        <div
          key={s.player.id}
          className={cn(
            "flex min-w-[5.5rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2",
            s.isLeader
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-card",
          )}
        >
          <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
            {s.isLeader ? (
              <Crown className="size-3.5 text-amber-500" />
            ) : (
              <span>#{s.rank}</span>
            )}
          </span>
          <span className="max-w-[5rem] truncate text-sm font-medium">
            {s.player.name}
          </span>
          <span className="text-xl font-bold tabular-nums">{s.total}</span>
        </div>
      ))}
    </div>
  );
}
