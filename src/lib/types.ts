// Core domain types for the extensible scoring engine.
// Everything game-specific lives behind `GameDefinition`; the rest of the app is generic.

export type ScoreDirection = "low" | "high";

/** Drives the config step UI generically (no per-game forms needed). */
export interface SetupField {
  key: string;
  label: string;
  type: "choice" | "number";
  /** For `choice`: selectable presets. A value of `null` means "Custom" (free number entry). */
  options?: { label: string; value: number | null }[];
  default: number;
  min?: number;
  max?: number;
  /** Short helper text shown under the field. */
  hint?: string;
}

export interface Player {
  id: string;
  name: string;
}

/** One round/hole: a score per player (null = not yet entered). */
export interface Round {
  scores: Record<string, number | null>;
}

export interface Game {
  id: string;
  gameType: string;
  config: Record<string, number>;
  players: Player[];
  rounds: Round[];
  createdAt: number;
  completedAt: number | null;
}

export interface Standing {
  player: Player;
  total: number;
  /** 1-based rank; ties share a rank. */
  rank: number;
  /** True when this player is currently tied/leading at rank 1. */
  isLeader: boolean;
}

export interface GameDefinition {
  id: string;
  name: string;
  tagline: string;
  /** Lucide icon name is wired in the registry; this is just metadata. */
  scoreDirection: ScoreDirection;
  roundLabel: string;
  roundLabelPlural: string;
  setupFields: SetupField[];
  /**
   * Increment sizes offered by the score-entry steppers, smallest first.
   * One value → a single −/+ pair; two → coarse + fine pairs (e.g. Farkle [50, 1000]).
   * Defaults to [1] when omitted.
   */
  scoreSteps?: number[];
  /** Total rounds for a fixed-length game, or `null` for open-ended (play until a condition). */
  totalRounds: (config: Record<string, number>) => number | null;
  /** Returns an error string if the entered score is invalid, else null. */
  validateScore: (value: number, config: Record<string, number>) => string | null;
  /** Whether the game has reached its end condition. */
  isComplete: (game: Game) => boolean;
  /** Optional human-readable summary of the win condition, shown during setup. */
  describeGoal?: (config: Record<string, number>) => string;
}
