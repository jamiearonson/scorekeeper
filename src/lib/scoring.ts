// Generic, game-agnostic scoring derived from a game's `scoreDirection`.
// A game definition declares rules; it never re-implements summation or ranking.

import type { Game, Standing } from "./types";
import { GAMES } from "./games";

/** Sum of all entered (non-null) scores for a player across rounds. */
export function playerTotal(game: Game, playerId: string): number {
  return game.rounds.reduce((sum, round) => {
    const v = round.scores[playerId];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
}

/** How many rounds have been fully entered (a score for every player). */
export function completedRoundCount(game: Game): number {
  return game.rounds.filter((round) =>
    game.players.every((p) => typeof round.scores[p.id] === "number"),
  ).length;
}

/**
 * Standings sorted best-first per the game's direction. Ties share a rank
 * (standard competition ranking: 1, 2, 2, 4).
 */
export function standings(game: Game): Standing[] {
  const def = GAMES[game.gameType];
  const dir = def?.scoreDirection ?? "low";

  const rows = game.players.map((player) => ({
    player,
    total: playerTotal(game, player.id),
  }));

  rows.sort((a, b) => (dir === "low" ? a.total - b.total : b.total - a.total));

  let lastTotal: number | null = null;
  let lastRank = 0;
  return rows.map((row, i) => {
    const rank = lastTotal !== null && row.total === lastTotal ? lastRank : i + 1;
    lastTotal = row.total;
    lastRank = rank;
    return { ...row, rank, isLeader: rank === 1 };
  });
}

/** Winning player(s) — only meaningful once the game is complete. Handles ties. */
export function winners(game: Game): Standing[] {
  return standings(game).filter((s) => s.rank === 1);
}
