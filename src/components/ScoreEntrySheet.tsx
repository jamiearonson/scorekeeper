import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Game } from "@/lib/types";
import { GAMES } from "@/lib/games";
import { useGame } from "@/lib/store";
import { NumberStepper } from "@/components/NumberStepper";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface ScoreEntrySheetProps {
  game: Game;
  /** Which round to edit, or null when closed. */
  roundIndex: number | null;
  onClose: () => void;
}

// Bottom sheet: one row per player with a big numeric field + steppers.
// Saving writes the whole round at once.
export function ScoreEntrySheet({ game, roundIndex, onClose }: ScoreEntrySheetProps) {
  const { setScore } = useGame();
  const def = GAMES[game.gameType];
  const steps = def.scoreSteps ?? [1];
  // Games like Farkle treat an untouched player as 0 (a bust), so the round closes out
  // by saving and you only bump the players who actually scored.
  const fallback = def.defaultScore ?? null;
  const open = roundIndex !== null;

  const [draft, setDraft] = useState<Record<string, number | null>>({});

  // Seed the draft from the round each time the sheet opens on a new round.
  useEffect(() => {
    if (roundIndex === null) return;
    const round = game.rounds[roundIndex];
    const seeded: Record<string, number | null> = {};
    for (const p of game.players) {
      const existing = round?.scores[p.id];
      seeded[p.id] = existing === null || existing === undefined ? fallback : existing;
    }
    setDraft(seeded);
    // Only re-seed when the targeted round changes, not on every score edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  function handleSave() {
    if (roundIndex === null) return;
    for (const p of game.players) {
      const v = draft[p.id] ?? fallback;
      if (v === null || v === undefined) continue;
      const err = def.validateScore(v, game.config);
      if (err) {
        toast.error(`${p.name}: ${err}`);
        return;
      }
    }
    for (const p of game.players) {
      setScore(roundIndex, p.id, draft[p.id] ?? fallback);
    }
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              {def.roundLabel} {roundIndex !== null ? roundIndex + 1 : ""}
            </DrawerTitle>
            <DrawerDescription>
              Enter each player's score for this {def.roundLabel.toLowerCase()}.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-4 pb-2">
            {game.players.map((p) =>
              steps.length > 1 ? (
                // Wide stacked layout: name above a full-width coarse/fine stepper.
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-xl border p-3"
                >
                  <span className="truncate font-medium">{p.name}</span>
                  <NumberStepper
                    size="lg"
                    steps={steps}
                    min={0}
                    value={draft[p.id] ?? null}
                    ariaLabel={`${p.name} score`}
                    onChange={(v) => setDraft((d) => ({ ...d, [p.id]: v }))}
                  />
                </div>
              ) : (
                // Compact inline layout for single-step games (golf).
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {p.name}
                  </span>
                  <div className="w-48 shrink-0">
                    <NumberStepper
                      size="lg"
                      steps={steps}
                      value={draft[p.id] ?? null}
                      ariaLabel={`${p.name} score`}
                      onChange={(v) => setDraft((d) => ({ ...d, [p.id]: v }))}
                    />
                  </div>
                </div>
              ),
            )}
          </div>

          <DrawerFooter>
            <Button size="lg" className="h-14 text-base" onClick={handleSave}>
              Save
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
