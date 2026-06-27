import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useGame } from "@/lib/store";
import {
  deleteGame,
  deleteOccasion,
  getOccasion,
  listGamesInOccasion,
  renameOccasion,
  type Occasion,
} from "@/lib/persistence";
import { winners } from "@/lib/scoring";
import type { Game } from "@/lib/types";
import { GameListItem } from "@/components/GameListItem";
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

export default function Group() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const { loadGame } = useGame();

  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null);
  const [confirmDeleteOccasion, setConfirmDeleteOccasion] = useState(false);

  useEffect(() => {
    getOccasion(id).then(setOccasion);
    listGamesInOccasion(id).then(setGames);
  }, [id]);

  // Most wins: tally rank-1 finishers of completed games, keyed by player name
  // (player ids differ per game).
  const standings = useMemo(() => {
    const tally = new Map<string, number>();
    for (const g of games ?? []) {
      if (!g.completedAt) continue;
      for (const w of winners(g)) {
        tally.set(w.player.name, (tally.get(w.player.name) ?? 0) + 1);
      }
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1]);
  }, [games]);

  function open(game: Game) {
    loadGame(game);
    navigate("/play");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const gid = pendingDelete.id;
    setGames((gs) => (gs ? gs.filter((g) => g.id !== gid) : gs));
    setPendingDelete(null);
    await deleteGame(gid);
  }

  async function saveName() {
    const next = nameDraft.trim();
    if (!next) return;
    setOccasion((o) => (o ? { ...o, name: next } : o));
    setEditing(false);
    await renameOccasion(id, next);
  }

  async function removeOccasion() {
    setConfirmDeleteOccasion(false);
    await deleteOccasion(id);
    navigate("/", { replace: true });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <header className="bg-background/80 sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="size-5" />
        </Button>
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
              maxLength={40}
              className="h-9"
            />
            <Button size="icon" className="size-9 shrink-0" onClick={saveName} aria-label="Save name">
              <Check className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <h1 className="flex-1 truncate text-lg font-semibold">
              {occasion?.name ?? "Occasion"}
            </h1>
            {occasion && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setNameDraft(occasion.name);
                    setEditing(true);
                  }}
                  aria-label="Rename occasion"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() => setConfirmDeleteOccasion(true)}
                  aria-label="Delete occasion"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {standings.length > 0 && (
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <Trophy className="size-3.5 text-amber-500" />
              Most wins
            </p>
            <div className="flex flex-col gap-1.5">
              {standings.map(([name, wins], i) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="font-medium">{name}</span>
                  </span>
                  <span className="tabular-nums">
                    {wins} {wins === 1 ? "win" : "wins"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          size="lg"
          className="h-12"
          onClick={() => navigate("/new", { state: { groupId: id } })}
        >
          <Plus className="size-5" />
          New game in this occasion
        </Button>

        {games === null ? (
          <div className="text-muted-foreground flex items-center justify-center py-10">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm text-balance">
            No games yet. Start one to add it here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {games.map((g) => (
              <GameListItem
                key={g.id}
                game={g}
                onOpen={() => open(g)}
                onDelete={() => setPendingDelete(g)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="max-w-[20rem]">
          <DialogHeader>
            <DialogTitle>Delete this game?</DialogTitle>
            <DialogDescription>This permanently removes the saved game.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOccasion} onOpenChange={setConfirmDeleteOccasion}>
        <DialogContent className="max-w-[20rem]">
          <DialogHeader>
            <DialogTitle>Delete this occasion?</DialogTitle>
            <DialogDescription>
              The occasion is removed. Its games stay in your history (just ungrouped).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" onClick={removeOccasion}>
              Delete occasion
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDeleteOccasion(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
