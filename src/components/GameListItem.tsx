import { Trash2, Trophy } from "lucide-react";
import type { Game } from "@/lib/types";
import { GAMES, GAME_ICONS } from "@/lib/games";
import { completedRoundCount, winners } from "@/lib/scoring";
import { Button } from "@/components/ui/button";

interface GameListItemProps {
  game: Game;
  onOpen: () => void;
  onDelete: () => void;
}

// A saved game row used in history and occasion screens.
export function GameListItem({ game, onOpen, onDelete }: GameListItemProps) {
  const def = GAMES[game.gameType];
  const Icon = GAME_ICONS[game.gameType];
  const complete = !!game.completedAt;
  const win = complete ? winners(game) : [];
  const date = new Date(game.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-2 rounded-xl border p-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
      >
        <div className="bg-secondary text-secondary-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
          {Icon ? <Icon className="size-5" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">
            {def?.name ?? game.gameType}
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
              {date}
            </span>
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {game.players.map((p) => p.name).join(", ")}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs">
            {complete ? (
              <>
                <Trophy className="size-3.5 text-amber-500" />
                <span className="font-medium">
                  {win.map((w) => w.player.name).join(" & ")}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                In progress · {completedRoundCount(game)}{" "}
                {def
                  ? (completedRoundCount(game) === 1
                      ? def.roundLabel
                      : def.roundLabelPlural
                    ).toLowerCase()
                  : "rounds"}
              </span>
            )}
          </p>
        </div>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground shrink-0"
        onClick={onDelete}
        aria-label="Delete game"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
