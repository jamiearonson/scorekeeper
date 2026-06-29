import type { Game, GameDefinition } from "@/lib/types";

// Self-contained total so this definition has no dependency on the scoring module
// (keeps the games registry free of import cycles).
function totalFor(game: Game, playerId: string): number {
  return game.rounds.reduce((sum, r) => {
    const v = r.scores[playerId];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
}

// Blank Slate: each round everyone secretly writes a word to fill a blank, then reveals
// at once. You want to match exactly one other player. Highest total wins, race to a
// target. Each player scores 0, 1, or 3 in a round (the scorekeeper applies the match
// rule from the reference). https://www.geekyhobbies.com/blank-slate-rules/
export const blankSlate: GameDefinition = {
  id: "blank-slate",
  name: "Blank Slate",
  tagline: "Match exactly one other player to score big.",
  scoreDirection: "high",
  roundLabel: "Round",
  roundLabelPlural: "Rounds",
  setupFields: [
    {
      key: "target",
      label: "Winning score",
      type: "choice",
      options: [
        { label: "15", value: 15 },
        { label: "25", value: 25 },
        { label: "Custom", value: null },
      ],
      default: 25,
      min: 1,
      max: 1000,
      hint: "First to reach this wins.",
    },
  ],
  scoreOptions: [0, 1, 3], // 0 = no match, 1 = matched 2+ players, 3 = matched exactly one
  defaultScore: 0, // un-touched players scored no match this round
  totalRounds: () => null, // open-ended
  validateScore: (value) => {
    if (!Number.isFinite(value)) return "Enter a number";
    if (!Number.isInteger(value)) return "Whole numbers only";
    if (value < 0) return "Must be 0 or more";
    return null;
  },
  isComplete: (game) =>
    game.players.some((p) => totalFor(game, p.id) >= game.config.target),
  describeGoal: (config) => `First to ${config.target} points wins.`,
  scoringReference: [
    {
      title: "Points each round",
      rules: [
        { combo: "Your word matches exactly one other player", points: "3 each" },
        { combo: "Your word matches two or more players", points: "1 each" },
        { combo: "Your word matches no one", points: "0" },
      ],
      note: "Everyone writes a word to fill the blank, then reveals at the same time. First player to the winning score wins.",
    },
  ],
};
