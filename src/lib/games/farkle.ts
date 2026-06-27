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
  // Standard Farkle scoring, for in-game reference. House rules vary — these are
  // the common defaults.
  scoringReference: [
    {
      title: "Singles",
      rules: [
        { combo: "Each 1", points: "100" },
        { combo: "Each 5", points: "50" },
      ],
    },
    {
      title: "Three of a kind",
      rules: [
        { combo: "Three 1s", points: "1,000" },
        { combo: "Three 2s", points: "200" },
        { combo: "Three 3s", points: "300" },
        { combo: "Three 4s", points: "400" },
        { combo: "Three 5s", points: "500" },
        { combo: "Three 6s", points: "600" },
      ],
      note: "Each extra die of the same value doubles the three-of-a-kind score (four = ×2, five = ×4, six = ×8).",
    },
    {
      title: "Special combinations",
      rules: [
        { combo: "Straight (1-2-3-4-5-6)", points: "1,500" },
        { combo: "Three pairs", points: "1,500" },
        { combo: "Four of a kind + a pair", points: "1,500" },
        { combo: "Two triplets", points: "2,500" },
        { combo: "Six of a kind", points: "3,000" },
      ],
    },
    {
      rules: [{ combo: "No scoring dice rolled", points: "Farkle — lose the turn" }],
      note: "Set aside at least one scoring die each roll to keep going, or bank your points.",
    },
  ],
};
