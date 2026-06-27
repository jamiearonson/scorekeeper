import type { GameDefinition } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScoringReferenceDialogProps {
  def: GameDefinition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Read-only scoring cheat-sheet for games that define one (e.g. Farkle).
export function ScoringReferenceDialog({
  def,
  open,
  onOpenChange,
}: ScoringReferenceDialogProps) {
  const sections = def.scoringReference ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[22rem] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{def.name} scoring</DialogTitle>
          <DialogDescription>
            Quick reference for what each combination is worth.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-5 pb-5 pt-4">
          <div className="flex flex-col gap-5">
            {sections.map((section, i) => (
              <section key={section.title ?? i} className="flex flex-col gap-1.5">
                {section.title && (
                  <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {section.title}
                  </h3>
                )}
                <dl className="flex flex-col">
                  {section.rules.map((rule) => (
                    <div
                      key={rule.combo}
                      className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5 last:border-0"
                    >
                      <dt className="text-sm">{rule.combo}</dt>
                      <dd className="text-sm font-semibold tabular-nums">
                        {rule.points}
                      </dd>
                    </div>
                  ))}
                </dl>
                {section.note && (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {section.note}
                  </p>
                )}
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
