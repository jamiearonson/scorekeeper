import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useGame } from "@/lib/store";
import { deleteGame, listGames } from "@/lib/persistence";
import type { Game } from "@/lib/types";
import { GameListItem } from "@/components/GameListItem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function History() {
  const navigate = useNavigate();
  const { loadGame } = useGame();
  const [games, setGames] = useState<Game[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null);

  useEffect(() => {
    listGames().then(setGames);
  }, []);

  function open(game: Game) {
    loadGame(game);
    navigate("/play");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setGames((gs) => (gs ? gs.filter((g) => g.id !== id) : gs));
    setPendingDelete(null);
    await deleteGame(id);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <header className="bg-background/80 sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-semibold">Past games</h1>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {games === null ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm text-balance">
            No saved games yet. Games you play are saved here automatically.
          </p>
        ) : (
          games.map((g) => (
            <GameListItem
              key={g.id}
              game={g}
              onOpen={() => open(g)}
              onDelete={() => setPendingDelete(g)}
            />
          ))
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
    </div>
  );
}
