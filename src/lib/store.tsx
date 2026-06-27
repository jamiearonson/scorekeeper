import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Game, Player } from "./types";
import { GAMES } from "./games";

const ACTIVE_KEY = "scorekeeper:v1:active";
const LAST_PLAYERS_KEY = "scorekeeper:v1:lastPlayers";
const LAST_GAME_KEY = "scorekeeper:v1:lastGameType";
const FAVORITES_KEY = "scorekeeper:v1:favorites";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${performance.now()}`;
}

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — non-fatal for a scratch scorecard */
  }
}

/** An empty round with a null slot per player. */
function emptyRound(players: Player[]) {
  return { scores: Object.fromEntries(players.map((p) => [p.id, null])) };
}

export interface StartGameInput {
  gameType: string;
  config: Record<string, number>;
  playerNames: string[];
  /** Occasion (group) this game belongs to, if any. */
  groupId?: string | null;
}

interface GameStore {
  game: Game | null;
  lastPlayers: string[];
  lastGameType: string | null;
  favorites: string[];
  startGame: (input: StartGameInput) => Game;
  /** Make an existing game (e.g. loaded from history) the active local game. */
  loadGame: (game: Game) => void;
  setScore: (roundIndex: number, playerId: string, value: number | null) => void;
  addRound: () => void;
  removeLastRound: () => void;
  completeGame: () => void;
  reopenGame: () => void;
  clearGame: () => void;
  addFavorite: (name: string) => void;
  removeFavorite: (name: string) => void;
}

const Ctx = createContext<GameStore | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(() => load<Game>(ACTIVE_KEY));
  const [lastPlayers, setLastPlayers] = useState<string[]>(
    () => load<string[]>(LAST_PLAYERS_KEY) ?? [],
  );
  const [lastGameType, setLastGameType] = useState<string | null>(
    () => load<string>(LAST_GAME_KEY),
  );
  const [favorites, setFavorites] = useState<string[]>(
    () => load<string[]>(FAVORITES_KEY) ?? [],
  );

  // Persist the active game on every change (or remove it when cleared).
  useEffect(() => {
    if (game) save(ACTIVE_KEY, game);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [game]);

  const startGame = useCallback((input: StartGameInput): Game => {
    const def = GAMES[input.gameType];
    const players: Player[] = input.playerNames.map((name, i) => ({
      id: uid(),
      name: name.trim() || `Player ${i + 1}`,
    }));

    // Pre-create the fixed number of rounds; open-ended games start with one.
    const total = def.totalRounds(input.config);
    const roundCount = total ?? 1;
    const rounds = Array.from({ length: roundCount }, () => emptyRound(players));

    const newGame: Game = {
      id: uid(),
      gameType: input.gameType,
      config: input.config,
      players,
      rounds,
      createdAt: Date.now(),
      completedAt: null,
      groupId: input.groupId ?? null,
    };

    setGame(newGame);
    const names = players.map((p) => p.name);
    setLastPlayers(names);
    setLastGameType(input.gameType);
    save(LAST_PLAYERS_KEY, names);
    save(LAST_GAME_KEY, input.gameType);
    return newGame;
  }, []);

  const loadGame = useCallback((g: Game) => setGame(g), []);

  const setScore = useCallback(
    (roundIndex: number, playerId: string, value: number | null) => {
      setGame((g) => {
        if (!g) return g;
        const rounds = g.rounds.map((r, i) =>
          i === roundIndex
            ? { scores: { ...r.scores, [playerId]: value } }
            : r,
        );
        return { ...g, rounds };
      });
    },
    [],
  );

  const addRound = useCallback(() => {
    setGame((g) => (g ? { ...g, rounds: [...g.rounds, emptyRound(g.players)] } : g));
  }, []);

  const removeLastRound = useCallback(() => {
    setGame((g) => {
      if (!g || g.rounds.length <= 1) return g;
      return { ...g, rounds: g.rounds.slice(0, -1) };
    });
  }, []);

  const completeGame = useCallback(() => {
    setGame((g) => (g ? { ...g, completedAt: Date.now() } : g));
  }, []);

  const reopenGame = useCallback(() => {
    setGame((g) => (g ? { ...g, completedAt: null } : g));
  }, []);

  const clearGame = useCallback(() => setGame(null), []);

  const addFavorite = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFavorites((favs) => {
      // Case-insensitive dedupe; keep the existing casing if already present.
      if (favs.some((f) => f.toLowerCase() === trimmed.toLowerCase())) return favs;
      const next = [...favs, trimmed];
      save(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((name: string) => {
    setFavorites((favs) => {
      const next = favs.filter((f) => f.toLowerCase() !== name.trim().toLowerCase());
      save(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<GameStore>(
    () => ({
      game,
      lastPlayers,
      lastGameType,
      favorites,
      startGame,
      loadGame,
      setScore,
      addRound,
      removeLastRound,
      completeGame,
      reopenGame,
      clearGame,
      addFavorite,
      removeFavorite,
    }),
    [
      game,
      lastPlayers,
      lastGameType,
      favorites,
      startGame,
      loadGame,
      setScore,
      addRound,
      removeLastRound,
      completeGame,
      reopenGame,
      clearGame,
      addFavorite,
      removeFavorite,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
