import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type { Game } from "./types";
import { useGame } from "./store";

// Real-time score sync via Supabase Realtime. Every device opens one connection to a
// shared channel and messages are relayed through Supabase — no peer-to-peer mesh, so it
// works for any number of watchers on any network. The scorekeeper hosts (source of
// truth) and broadcasts the whole game; guests subscribe and get a read-only live view.

const SESSION_KEY = "scorekeeper:v1:syncSession";
// Crockford base32 without ambiguous chars (no I/L/O/U) — easy to read aloud / type.
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 6;

export type SyncRole = "off" | "host" | "guest";
export type SyncStatus = "idle" | "connecting" | "connected" | "disconnected";

interface SyncStore {
  role: SyncRole;
  code: string | null;
  status: SyncStatus;
  /** Watchers connected to a hosted game (excludes self). */
  peerCount: number;
  /** The game a guest is viewing (null until the host's first state arrives). */
  remoteGame: Game | null;
  /** Start hosting. Pass a custom code (≥3 chars) to use instead of a random one. */
  host: (customCode?: string) => string;
  join: (code: string) => void;
  stop: () => void;
}

const Ctx = createContext<SyncStore | null>(null);

function makeCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Codes are uppercase A–Z/0–9, capped at 12 chars — shareable by voice or QR. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

/** Shortest acceptable custom code. */
export const MIN_CODE_LENGTH = 3;
export const MAX_CODE_LENGTH = 12;

function channelName(code: string): string {
  return `scorekeeper:${code}`;
}

interface Session {
  role: SyncRole;
  code: string;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { game } = useGame();

  const [role, setRole] = useState<SyncRole>("off");
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [peerCount, setPeerCount] = useState(0);
  const [remoteGame, setRemoteGame] = useState<Game | null>(null);

  // Imperative channel handle lives outside React's render cycle.
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const sendStateRef = useRef<((g: Game) => void) | null>(null);
  // Refs mirror state so channel callbacks always read current values.
  const roleRef = useRef<SyncRole>("off");
  const statusRef = useRef<SyncStatus>("idle");
  statusRef.current = status;
  const gameRef = useRef<Game | null>(game);
  gameRef.current = game;
  // Stable id for this device's presence entry.
  const selfIdRef = useRef<string>("");
  if (!selfIdRef.current) {
    selfIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `self-${Math.random().toString(36).slice(2)}`;
  }

  const teardown = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    subscribedRef.current = false;
    sendStateRef.current = null;
    setPeerCount(0);
  }, []);

  const startChannel = useCallback(
    (roomCode: string, asRole: SyncRole) => {
      teardown();
      roleRef.current = asRole;

      const channel = supabase.channel(channelName(roomCode), {
        config: {
          broadcast: { self: false },
          presence: { key: selfIdRef.current },
        },
      });
      channelRef.current = channel;

      const sendState = (g: Game) => {
        if (!subscribedRef.current) return;
        channel.send({ type: "broadcast", event: "state", payload: g });
      };
      sendStateRef.current = sendState;

      // Guests apply the host's broadcast.
      channel.on("broadcast", { event: "state" }, ({ payload }) => {
        if (roleRef.current !== "guest") return;
        setRemoteGame(payload as Game);
        setStatus("connected");
      });

      // A guest announces itself on join; the host replies with the current game so
      // late joiners are seeded immediately (not only on the next score change).
      channel.on("broadcast", { event: "hello" }, () => {
        if (roleRef.current === "host" && gameRef.current) sendState(gameRef.current);
      });

      // Presence → watcher count, and lets a guest notice the host leaving.
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const entries = Object.values(state).flat() as Array<{ role?: string }>;
        setPeerCount(Math.max(0, entries.length - 1));
        if (roleRef.current === "guest" && statusRef.current === "connected") {
          const hostPresent = entries.some((e) => e.role === "host");
          if (!hostPresent) setStatus("disconnected");
        }
      });

      channel.subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") {
          subscribedRef.current = true;
          channel.track({ role: asRole, id: selfIdRef.current });
          if (asRole === "host") {
            setStatus("connected");
            if (gameRef.current) sendState(gameRef.current);
          } else {
            // Ask the host to send the current game.
            channel.send({ type: "broadcast", event: "hello", payload: {} });
          }
        } else if (
          channelStatus === "CHANNEL_ERROR" ||
          channelStatus === "TIMED_OUT"
        ) {
          if (roleRef.current === "guest") setStatus("disconnected");
        }
      });
    },
    [teardown],
  );

  const persist = (session: Session | null) => {
    try {
      if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* sessionStorage unavailable — non-fatal */
    }
  };

  const host = useCallback((customCode?: string): string => {
    const custom = customCode ? normalizeCode(customCode) : "";
    const newCode = custom.length >= MIN_CODE_LENGTH ? custom : makeCode();
    setRole("host");
    roleRef.current = "host";
    setCode(newCode);
    setRemoteGame(null);
    setStatus("connecting");
    startChannel(newCode, "host");
    persist({ role: "host", code: newCode });
    return newCode;
  }, [startChannel]);

  const join = useCallback(
    (joinCode: string) => {
      const norm = normalizeCode(joinCode);
      if (!norm) return;
      setRole("guest");
      roleRef.current = "guest";
      setCode(norm);
      setRemoteGame(null);
      setStatus("connecting");
      startChannel(norm, "guest");
      persist({ role: "guest", code: norm });
    },
    [startChannel],
  );

  const stop = useCallback(() => {
    teardown();
    roleRef.current = "off";
    setRole("off");
    setCode(null);
    setStatus("idle");
    setRemoteGame(null);
    persist(null);
  }, [teardown]);

  // Resume an in-progress session across a reload (guest rejoins; host resumes sharing).
  useEffect(() => {
    // If a channel is already active (e.g. the Join route's effect ran first during this
    // same mount), don't start a second one.
    if (channelRef.current) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(SESSION_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as Session;
      // Reuse the saved code so a host reload keeps the same code (custom or random).
      if (s.role === "host") host(s.code);
      else if (s.role === "guest") join(s.code);
    } catch {
      /* ignore malformed session */
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Host: broadcast the whole game whenever it changes.
  useEffect(() => {
    if (role === "host" && game) sendStateRef.current?.(game);
  }, [game, role]);

  // Leave the channel when the provider unmounts.
  useEffect(() => () => teardown(), [teardown]);

  const value = useMemo<SyncStore>(
    () => ({ role, code, status, peerCount, remoteGame, host, join, stop }),
    [role, code, status, peerCount, remoteGame, host, join, stop],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync(): SyncStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
