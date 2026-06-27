import { supabase } from "./supabaseClient";
import { ensureAuth } from "./auth";
import type { Game } from "./types";

// Durable storage of games and occasions in Supabase, scoped to this device's anonymous
// user by row-level security. Every call is best-effort: if there's no auth/network, it
// quietly no-ops (returns null/[]) so offline play is never blocked — localStorage remains
// the reliable local copy of the active game.

export interface Occasion {
  id: string;
  name: string;
  createdAt: number;
}

interface GameRow {
  id: string;
  group_id: string | null;
  game_type: string;
  config: Record<string, number>;
  players: Game["players"];
  rounds: Game["rounds"];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface GroupRow {
  id: string;
  name: string;
  created_at: string;
}

const iso = (ms: number) => new Date(ms).toISOString();

function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    gameType: row.game_type,
    config: row.config,
    players: row.players,
    rounds: row.rounds,
    createdAt: Date.parse(row.created_at),
    completedAt: row.completed_at ? Date.parse(row.completed_at) : null,
    groupId: row.group_id,
  };
}

function rowToOccasion(row: GroupRow): Occasion {
  return { id: row.id, name: row.name, createdAt: Date.parse(row.created_at) };
}

// ---- Games ----

export async function upsertGame(game: Game): Promise<void> {
  const ownerId = await ensureAuth();
  if (!ownerId) return;
  await supabase.from("games").upsert({
    id: game.id,
    owner_id: ownerId,
    group_id: game.groupId ?? null,
    game_type: game.gameType,
    config: game.config,
    players: game.players,
    rounds: game.rounds,
    created_at: iso(game.createdAt),
    updated_at: new Date().toISOString(),
    completed_at: game.completedAt ? iso(game.completedAt) : null,
  });
}

export async function listGames(): Promise<Game[]> {
  const ownerId = await ensureAuth();
  if (!ownerId) return [];
  const { data } = await supabase
    .from("games")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data as GameRow[] | null)?.map(rowToGame) ?? [];
}

export async function getGame(id: string): Promise<Game | null> {
  const ownerId = await ensureAuth();
  if (!ownerId) return null;
  const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  return data ? rowToGame(data as GameRow) : null;
}

export async function deleteGame(id: string): Promise<void> {
  if (!(await ensureAuth())) return;
  await supabase.from("games").delete().eq("id", id);
}

// ---- Occasions (groups) ----

export async function createOccasion(name: string): Promise<Occasion | null> {
  const ownerId = await ensureAuth();
  if (!ownerId) return null;
  const { data } = await supabase
    .from("groups")
    .insert({ owner_id: ownerId, name: name.trim() })
    .select("*")
    .maybeSingle();
  return data ? rowToOccasion(data as GroupRow) : null;
}

export async function listOccasions(): Promise<Occasion[]> {
  const ownerId = await ensureAuth();
  if (!ownerId) return [];
  const { data } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as GroupRow[] | null)?.map(rowToOccasion) ?? [];
}

export async function getOccasion(id: string): Promise<Occasion | null> {
  const ownerId = await ensureAuth();
  if (!ownerId) return null;
  const { data } = await supabase.from("groups").select("*").eq("id", id).maybeSingle();
  return data ? rowToOccasion(data as GroupRow) : null;
}

export async function renameOccasion(id: string, name: string): Promise<void> {
  if (!(await ensureAuth())) return;
  await supabase.from("groups").update({ name: name.trim() }).eq("id", id);
}

export async function deleteOccasion(id: string): Promise<void> {
  if (!(await ensureAuth())) return;
  await supabase.from("groups").delete().eq("id", id);
}

export async function listGamesInOccasion(groupId: string): Promise<Game[]> {
  const ownerId = await ensureAuth();
  if (!ownerId) return [];
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("group_id", groupId)
    .order("updated_at", { ascending: false });
  return (data as GameRow[] | null)?.map(rowToGame) ?? [];
}
