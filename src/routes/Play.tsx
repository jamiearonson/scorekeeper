import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Flag,
  Pencil,
  Plus,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/lib/store";
import { GAMES } from "@/lib/games";
import { completedRoundCount, winners } from "@/lib/scoring";
import { Leaderboard } from "@/components/Leaderboard";
import { Scorecard } from "@/components/Scorecard";
import { ScoreEntrySheet } from "@/components/ScoreEntrySheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Play() {
  const navigate = useNavigate();
  const { game, addRound, completeGame, clearGame, startGame } = useGame();
  const [editRound, setEditRound] = useState<number | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);

  // No active game (e.g. cleared in another tab) — bounce home.
  useEffect(() => {
    if (!game) navigate("/", { replace: true });
  }, [game, navigate]);

  if (!game) return null;

  const def = GAMES[game.gameType];
  const total = def.totalRounds(game.config);
  const done = completedRoundCount(game);
  const complete = !!game.completedAt;
  const reachedEnd = def.isComplete(game);

  // First round that still has a missing score (the natural "next" to enter).
  const nextRoundIndex = game.rounds.findIndex((r) =>
    game.players.some((p) => typeof r.scores[p.id] !== "number"),
  );

  function handleEnterScores() {
    if (nextRoundIndex >= 0) {
      setEditRound(nextRoundIndex);
    } else if (total === null) {
      // Open-ended game with every round full → start a fresh round.
      addRound();
      setEditRound(game!.rounds.length);
    } else {
      toast.info("All rounds are filled — tap a row to edit.");
    }
  }

  function handlePlayAgain() {
    startGame({
      gameType: game!.gameType,
      config: game!.config,
      playerNames: game!.players.map((p) => p.name),
    });
    setConfirmFinish(false);
  }

  function handleNewGame() {
    clearGame();
    navigate("/new");
  }

  function handleFinish() {
    completeGame();
    setConfirmFinish(false);
  }

  const win = complete ? winners(game) : [];

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col landscape:max-w-6xl">
      <header className="bg-background/80 sticky top-0 z-20 flex items-center gap-2 border-b px-3 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight">
            {def.name}
          </h1>
          <p className="text-muted-foreground text-xs">
            {total
              ? `${done} / ${total} ${def.roundLabelPlural.toLowerCase()}`
              : `${done} ${(done === 1 ? def.roundLabel : def.roundLabelPlural).toLowerCase()} played`}
          </p>
        </div>
        {!complete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmFinish(true)}
          >
            <Flag className="size-4" />
            Finish
          </Button>
        )}
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">
        {complete && win.length > 0 && (
          <WinnerBanner names={win.map((w) => w.player.name)} total={win[0].total} />
        )}

        {reachedEnd && !complete && (
          <button
            type="button"
            onClick={() => setConfirmFinish(true)}
            className="border-primary/40 bg-primary/5 text-primary flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
          >
            <Trophy className="size-4" />
            {total
              ? "All holes entered — tap to finish"
              : "Target reached — tap to finish"}
          </button>
        )}

        <Leaderboard game={game} />

        <Scorecard game={game} onEditRound={(i) => setEditRound(i)} />

        {!complete && (
          <Button
            size="lg"
            className="h-14 text-base"
            onClick={handleEnterScores}
          >
            {nextRoundIndex >= 0 ? (
              <>
                <Pencil className="size-5" />
                Enter {def.roundLabel} {nextRoundIndex + 1}
              </>
            ) : (
              <>
                <Plus className="size-5" />
                Add {def.roundLabel}
              </>
            )}
          </Button>
        )}

        {complete && (
          <div className="flex flex-col gap-3">
            <Button size="lg" className="h-14 text-base" onClick={handlePlayAgain}>
              <RotateCcw className="size-5" />
              Play again — same players
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12"
              onClick={handleNewGame}
            >
              New game
            </Button>
          </div>
        )}
      </div>

      <ScoreEntrySheet
        game={game}
        roundIndex={editRound}
        onClose={() => setEditRound(null)}
      />

      <Dialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <DialogContent className="max-w-[20rem]">
          <DialogHeader>
            <DialogTitle>Finish this game?</DialogTitle>
            <DialogDescription>
              This locks in the final standings. You can still play again with the
              same players afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleFinish}>Finish &amp; see winner</Button>
            <Button variant="ghost" onClick={() => setConfirmFinish(false)}>
              Keep playing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WinnerBanner({ names, total }: { names: string[]; total: number }) {
  const tie = names.length > 1;
  return (
    <div className="from-amber-500/20 to-primary/10 flex flex-col items-center gap-1 rounded-2xl border border-amber-500/30 bg-gradient-to-br px-4 py-5 text-center">
      <Trophy className="size-8 text-amber-500" />
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {tie ? "It's a tie!" : "Winner"}
      </p>
      <p className="text-xl font-bold">{names.join(" & ")}</p>
      <p className="text-muted-foreground text-sm tabular-nums">
        {total} points
      </p>
    </div>
  );
}
