import type { Game, GameDefinition } from "@/lib/types";

// Self-contained total so this definition has no dependency on the scoring module
// (keeps the games registry free of import cycles).
function totalFor(game: Game, playerId: string): number {
  return game.rounds.reduce((sum, r) => {
    const v = r.scores[playerId];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
}

// Farkle: open-ended; keep banking points each round until someone reaches the
// target score. Highest total wins.
export const farkle: GameDefinition = {
  id: "farkle",
  name: "Farkle",
  tagline: "Race to the target — highest total wins.",
  scoreDirection: "high",
  roundLabel: "Round",
  roundLabelPlural: "Rounds",
  setupFields: [
    {
      key: "target",
      label: "Target score",
      type: "choice",
      options: [
        { label: "5,000", value: 5000 },
        { label: "10,000", value: 10000 },
        { label: "Custom", value: null },
      ],
      default: 10000,
      min: 100,
      max: 1000000,
      hint: "First to reach this wins.",
    },
  ],
  scoreSteps: [50, 1000], // fine = 50, coarse = 1000
  totalRounds: () => null, // open-ended
  validateScore: (value) => {
    if (!Number.isFinite(value)) return "Enter a number";
    if (!Number.isInteger(value)) return "Whole numbers only";
    if (value < 0) return "Must be 0 or more";
    return null;
  },
  isComplete: (game) =>
    game.players.some((p) => totalFor(game, p.id) >= game.config.target),
  describeGoal: (config) =>
    `First to ${config.target.toLocaleString()} points wins.`,
};
