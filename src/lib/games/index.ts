import type { LucideIcon } from "lucide-react";
import { Club, Dices } from "lucide-react";
import type { GameDefinition } from "@/lib/types";
import { golf } from "./golf";
import { farkle } from "./farkle";

// The registry. Adding a game = implement a GameDefinition file and register it here.
export const GAMES: Record<string, GameDefinition> = {
  golf,
  farkle,
};

/** Icon per game, kept out of the definition so types stay framework-agnostic. */
export const GAME_ICONS: Record<string, LucideIcon> = {
  golf: Club,
  farkle: Dices,
};

/** Ordered list for pickers. */
export const GAME_LIST: GameDefinition[] = Object.values(GAMES);
