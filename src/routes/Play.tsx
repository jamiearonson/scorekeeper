import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Flag,
  LogOut,
  Pencil,
  PenLine,
  Plus,
  Radio,
  RotateCcw,
  Share2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/lib/store";
import { useSync } from "@/lib/sync";
import { useWakeLock } from "@/lib/useWakeLock";
import { GAMES } from "@/lib/games";
import { completedRoundCount, winners } from "@/lib/scoring";
import { Leaderboard } from "@/components/Leaderboard";
import { Scorecard } from "@/components/Scorecard";
import { ScoreEntrySheet } from "@/components/ScoreEntrySheet";
import { ShareGameDialog } from "@/components/ShareGameDialog";
import { ScoringReferenceDialog } from "@/components/ScoringReferenceDialog";
import { ScratchPad } from "@/components/ScratchPad";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const sync = useSync();
  const [editRound, setEditRound] = useState<number | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [scratchOpen, setScratchOpen] = useState(false);

  const isGuest = sync.role === "guest";

  // Keep the screen awake while scorekeeping (runs for both host/solo and guest views).
  useWakeLock(true);

  // Guests render the host's broadcast (handled in GuestPlay); hosts/solo bounce
  // home if their local game is gone.
  useEffect(() => {
    if (!isGuest && !game) navigate("/", { replace: true });
  }, [isGuest, game, navigate]);

  if (isGuest) return <GuestPlay />;
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
        {def.id === "blank-slate" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScratchOpen(true)}
            aria-label="Scratch pad"
          >
            <PenLine className="size-5" />
          </Button>
        )}
        {def.scoringReference && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScoringOpen(true)}
            aria-label="Scoring reference"
          >
            <BookOpen className="size-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="px-2"
        >
          {sync.role === "host" ? (
            <span className="flex items-center gap-1.5 text-emerald-500">
              <Radio className="size-4" />
              {sync.peerCount}
            </span>
          ) : (
            <Share2 className="size-4" />
          )}
        </Button>
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

      <ShareGameDialog open={shareOpen} onOpenChange={setShareOpen} />

      <ScoringReferenceDialog
        def={def}
        open={scoringOpen}
        onOpenChange={setScoringOpen}
      />

      {scratchOpen && <ScratchPad onClose={() => setScratchOpen(false)} />}

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

// Read-only live view for a guest watching the scorekeeper's game.
function GuestPlay() {
  const navigate = useNavigate();
  const sync = useSync();
  const game = sync.remoteGame;
  const [scoringOpen, setScoringOpen] = useState(false);
  const [scratchOpen, setScratchOpen] = useState(false);

  function leave() {
    sync.stop();
    navigate("/", { replace: true });
  }

  const def = game ? GAMES[game.gameType] : null;
  const total = def && game ? def.totalRounds(game.config) : null;
  const done = game ? completedRoundCount(game) : 0;
  const complete = !!game?.completedAt;
  const win = complete && game ? winners(game) : [];
  const live = sync.status === "connected";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col landscape:max-w-6xl">
      <header className="bg-background/80 sticky top-0 z-20 flex items-center gap-2 border-b px-3 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={leave}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight">
            {def ? def.name : "Joining…"}
          </h1>
          <p className="text-muted-foreground text-xs">
            {def && game
              ? total
                ? `${done} / ${total} ${def.roundLabelPlural.toLowerCase()}`
                : `${done} ${(done === 1 ? def.roundLabel : def.roundLabelPlural).toLowerCase()} played`
              : "Connecting to the scorekeeper"}
          </p>
        </div>
        {def?.id === "blank-slate" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScratchOpen(true)}
            aria-label="Scratch pad"
          >
            <PenLine className="size-5" />
          </Button>
        )}
        {def?.scoringReference && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScoringOpen(true)}
            aria-label="Scoring reference"
          >
            <BookOpen className="size-5" />
          </Button>
        )}
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            live
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Radio className="size-3.5" />
          {live ? "Live" : "Offline"}
        </span>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="text-muted-foreground rounded-lg bg-secondary/60 px-3 py-2 text-center text-sm">
          {live
            ? "You're watching the scorekeeper's game. Scores update automatically."
            : "Lost connection to the scorekeeper. Showing the last known score."}
        </div>

        {complete && win.length > 0 && (
          <WinnerBanner names={win.map((w) => w.player.name)} total={win[0].total} />
        )}

        {game && def ? (
          <>
            <Leaderboard game={game} />
            <Scorecard game={game} onEditRound={() => {}} readOnly />
          </>
        ) : (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Waiting for the scorekeeper…
          </p>
        )}

        <Button variant="outline" size="lg" className="h-12" onClick={leave}>
          <LogOut className="size-4" />
          Leave game
        </Button>
      </div>

      {def && (
        <ScoringReferenceDialog
          def={def}
          open={scoringOpen}
          onOpenChange={setScoringOpen}
        />
      )}

      {scratchOpen && <ScratchPad onClose={() => setScratchOpen(false)} />}
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
