import type { Game } from "@/lib/types";
import { GAMES } from "@/lib/games";
import { playerTotal } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface ScorecardProps {
  game: Game;
  /** Tap a cell to edit that round. */
  onEditRound: (roundIndex: number) => void;
  /** Disable editing (e.g. a guest watching a synced game). */
  readOnly?: boolean;
}

// Grid: rows = rounds, columns = players, sticky round column + totals row.
export function Scorecard({ game, onEditRound, readOnly = false }: ScorecardProps) {
  const def = GAMES[game.gameType];
  const players = game.players;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/60">
            <th className="bg-muted/60 sticky left-0 z-10 px-3 py-2 text-left font-medium">
              {def.roundLabel}
            </th>
            {players.map((p) => (
              <th
                key={p.id}
                className="min-w-[4.5rem] px-2 py-2 text-center font-medium"
              >
                <span className="block max-w-[5rem] truncate">{p.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {game.rounds.map((round, i) => {
            const filled = players.every(
              (p) => typeof round.scores[p.id] === "number",
            );
            return (
              <tr
                key={i}
                className={cn(
                  "border-t transition",
                  !readOnly && "cursor-pointer active:bg-accent",
                )}
                onClick={readOnly ? undefined : () => onEditRound(i)}
              >
                <td className="bg-background sticky left-0 z-10 px-3 py-2 font-medium">
                  {i + 1}
                  {!filled && (
                    <span className="text-muted-foreground ml-1 text-xs">•</span>
                  )}
                </td>
                {players.map((p) => {
                  const v = round.scores[p.id];
                  return (
                    <td
                      key={p.id}
                      className="px-2 py-2 text-center tabular-nums"
                    >
                      {typeof v === "number" ? (
                        v
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/60 border-t-2">
            <td className="bg-muted/60 sticky left-0 z-10 px-3 py-2.5 font-semibold">
              Total
            </td>
            {players.map((p) => (
              <td
                key={p.id}
                className={cn(
                  "px-2 py-2.5 text-center font-bold tabular-nums",
                )}
              >
                {playerTotal(game, p.id)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
