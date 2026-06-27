import { useNavigate } from "react-router-dom";
import { Plus, Play as PlayIcon, Trophy } from "lucide-react";
import { useGame } from "@/lib/store";
import { GAMES, GAME_ICONS } from "@/lib/games";
import { completedRoundCount } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function Home() {
  const navigate = useNavigate();
  const { game } = useGame();

  const def = game ? GAMES[game.gameType] : null;
  const Icon = game ? GAME_ICONS[game.gameType] : null;
  const total = def && game ? def.totalRounds(game.config) : null;
  const done = game ? completedRoundCount(game) : 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="flex flex-col items-center gap-2 pt-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Trophy className="size-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Scorekeeper</h1>
        <p className="text-muted-foreground text-balance">
          Fast score tracking for the games you play.
        </p>
      </header>

      <InstallPrompt />

      {game && def && Icon && (
        <Card
          className="cursor-pointer border-primary/30 transition active:scale-[0.99]"
          onClick={() => navigate("/play")}
        >
          <CardContent className="flex items-center gap-4">
            <div className="bg-secondary text-secondary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {game.completedAt ? "Finished game" : "Game in progress"}
              </p>
              <p className="truncate font-semibold">{def.name}</p>
              <p className="text-muted-foreground truncate text-sm">
                {game.players.map((p) => p.name).join(", ")}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {total
                  ? `${done}/${total} ${def.roundLabelPlural.toLowerCase()}`
                  : `${done} ${(done === 1 ? def.roundLabel : def.roundLabelPlural).toLowerCase()} played`}
              </p>
            </div>
            <Button size="icon" className="shrink-0" tabIndex={-1}>
              <PlayIcon className="size-5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <Button
          size="lg"
          className="h-14 text-base"
          onClick={() => navigate("/new")}
        >
          <Plus className="size-5" />
          New Game
        </Button>
        {game && (
          <p className="text-muted-foreground text-center text-xs">
            Starting a new game keeps this one until you finish setup.
          </p>
        )}
      </div>
    </div>
  );
}
