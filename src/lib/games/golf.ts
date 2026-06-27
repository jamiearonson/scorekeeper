import type { GameDefinition } from "@/lib/types";

// Golf (card game): play a fixed number of holes; lowest cumulative total wins.
export const golf: GameDefinition = {
  id: "golf",
  name: "Golf",
  tagline: "Lowest total wins — like real golf.",
  scoreDirection: "low",
  roundLabel: "Hole",
  roundLabelPlural: "Holes",
  setupFields: [
    {
      key: "holes",
      label: "Number of holes",
      type: "choice",
      options: [
        { label: "9", value: 9 },
        { label: "18", value: 18 },
        { label: "Custom", value: null },
      ],
      default: 9,
      min: 1,
      max: 99,
      hint: "How many hands you'll play.",
    },
  ],
  totalRounds: (config) => config.holes,
  validateScore: (value) => {
    if (!Number.isFinite(value)) return "Enter a number";
    if (!Number.isInteger(value)) return "Whole numbers only";
    return null;
  },
  isComplete: (game) => {
    const holes = game.config.holes;
    const filled = game.rounds.filter((r) =>
      game.players.every((p) => typeof r.scores[p.id] === "number"),
    ).length;
    return filled >= holes;
  },
  describeGoal: (config) =>
    `Lowest total after ${config.holes} ${config.holes === 1 ? "hole" : "holes"} wins.`,
};
