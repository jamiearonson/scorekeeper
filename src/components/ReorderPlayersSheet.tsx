import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import type { Game, Player } from "@/lib/types";
import { useGame } from "@/lib/store";
import { SortableList, SortableRow } from "@/components/SortableList";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface ReorderPlayersSheetProps {
  game: Game;
  open: boolean;
  onClose: () => void;
}

// Drag players into seating order so the scorecard columns and entry rows match the table.
export function ReorderPlayersSheet({ game, open, onClose }: ReorderPlayersSheetProps) {
  const { reorderPlayers } = useGame();
  const [order, setOrder] = useState<Player[]>(game.players);

  // Re-seed from the game whenever the sheet opens.
  useEffect(() => {
    if (open) setOrder(game.players);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function save() {
    reorderPlayers(order.map((p) => p.id));
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle>Player order</DrawerTitle>
            <DrawerDescription>
              Drag the handles into seating order to match the table.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-4 pb-2">
            <SortableList
              ids={order.map((p) => p.id)}
              onReorder={(ids) =>
                setOrder((prev) =>
                  ids
                    .map((id) => prev.find((p) => p.id === id))
                    .filter((p): p is Player => Boolean(p)),
                )
              }
            >
              <div className="flex flex-col gap-2">
                {order.map((p, i) => (
                  <SortableRow key={p.id} id={p.id}>
                    {({ handle, isDragging }) => (
                      <div
                        className={
                          "bg-card flex items-center gap-3 rounded-xl border p-3" +
                          (isDragging ? " ring-1 ring-primary" : "")
                        }
                      >
                        <button
                          type="button"
                          {...handle}
                          aria-label={`Drag ${p.name}`}
                          className="text-muted-foreground -m-1 cursor-grab touch-none p-1 active:cursor-grabbing"
                        >
                          <GripVertical className="size-5" />
                        </button>
                        <span className="bg-secondary text-secondary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {p.name}
                        </span>
                      </div>
                    )}
                  </SortableRow>
                ))}
              </div>
            </SortableList>
          </div>

          <DrawerFooter>
            <Button size="lg" className="h-14 text-base" onClick={save}>
              Done
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
