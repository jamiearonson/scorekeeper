import type { Game, GameDefinition } from "@/lib/types";

// Self-contained total so this definition has no dependency on the scoring module
// (keeps the games registry free of import cycles).
function totalFor(game: Game, playerId: string): number {
  return game.rounds.reduce((sum, r) => {
    const v = r.scores[playerId];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
}

// Config flag for `format`: fixed number of rounds vs open-ended race to a target.
const FIXED = 0;
const TARGET = 1;

// Midnight (1-4-24): six dice, rolled and kept a few at a time. You must end up
// keeping a 1 and a 4 to qualify; your other four dice are summed for the round
// score (4–24, or 0 if you never qualified). Highest total wins.
// https://en.wikipedia.org/wiki/Midnight_(game)
export const midnight: GameDefinition = {
  id: "midnight",
  name: "Midnight (1-4-24)",
  tagline: "Qualify with a 1 and a 4 — highest total wins.",
  scoreDirection: "high",
  roundLabel: "Round",
  roundLabelPlural: "Rounds",
  setupFields: [
    {
      key: "format",
      label: "Match format",
      type: "choice",
      options: [
        { label: "Fixed rounds", value: FIXED },
        { label: "Race to a target", value: TARGET },
      ],
      default: FIXED,
    },
    {
      key: "rounds",
      label: "Number of rounds",
      type: "choice",
      options: [
        { label: "5", value: 5 },
        { label: "10", value: 10 },
        { label: "Custom", value: null },
      ],
      default: 5,
      min: 1,
      max: 99,
      hint: "Everyone gets this many turns; highest total wins.",
      showIf: (config) => config.format === FIXED,
    },
    {
      key: "target",
      label: "Target score",
      type: "choice",
      options: [
        { label: "100", value: 100 },
        { label: "200", value: 200 },
        { label: "Custom", value: null },
      ],
      default: 100,
      min: 4,
      max: 10000,
      hint: "First to reach this wins.",
      showIf: (config) => config.format === TARGET,
    },
  ],
  scoreSteps: [1],
  defaultScore: 0, // failing to qualify is a 0 — only touch the players who scored
  totalRounds: (config) => (config.format === TARGET ? null : config.rounds),
  validateScore: (value) => {
    if (!Number.isFinite(value)) return "Enter a number";
    if (!Number.isInteger(value)) return "Whole numbers only";
    if (value < 0) return "Must be 0 or more";
    if (value > 24) return "Max is 24 (four 6s)";
    // Four scoring dice can't total 1, 2 or 3 — that's a mis-tap.
    if (value > 0 && value < 4) return "Scores are 0, or 4–24";
    return null;
  },
  isComplete: (game) => {
    if (game.config.format === TARGET) {
      return game.players.some((p) => totalFor(game, p.id) >= game.config.target);
    }
    const filled = game.rounds.filter((r) =>
      game.players.every((p) => typeof r.scores[p.id] === "number"),
    ).length;
    return filled >= game.config.rounds;
  },
  describeGoal: (config) =>
    config.format === TARGET
      ? `First to ${config.target} points wins.`
      : `Highest total after ${config.rounds} ${config.rounds === 1 ? "round" : "rounds"} wins.`,
  scoringReference: [
    {
      title: "Your turn",
      rules: [
        { combo: "Roll all six dice", points: "Keep 1+" },
        { combo: "Re-roll the rest, keeping at least one more", points: "Repeat" },
        { combo: "Dice you've kept", points: "Locked" },
      ],
      note: "Your turn ends once all six dice are kept.",
    },
    {
      title: "Scoring",
      rules: [
        { combo: "Kept a 1 and a 4 (the qualifier)", points: "Scores" },
        { combo: "Total of your other four dice", points: "4 – 24" },
        { combo: "No 1, or no 4", points: "0" },
        { combo: "1, 4 and four 6s — “Midnight”", points: "24" },
      ],
      note: "The qualifying 1 and 4 are worth nothing themselves — only the other four dice count.",
    },
  ],
};
