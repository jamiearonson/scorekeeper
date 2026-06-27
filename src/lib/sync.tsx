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
import { joinRoom, type Room } from "trystero";
import type { Game } from "./types";
import { useGame } from "./store";

// Real-time score sync over WebRTC. Trystero's default Nostr transport handles peer
// discovery via public relays — no server or database of our own. The scorekeeper hosts
// (their device is the source of truth); guests join by code/QR and get a read-only live view.

const APP_ID = "scorekeeper-p2p-v1";
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
  /** Other peers connected to the room (watchers for a host; host+others for a guest). */
  peerCount: number;
  /** The game a guest is viewing (null until the host's first state arrives). */
  remoteGame: Game | null;
  host: () => string;
  join: (code: string) => void;
  stop: () => void;
}

const Ctx = createContext<SyncStore | null>(null);

function makeCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
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

  // Imperative room handles live outside React's render cycle.
  const roomRef = useRef<Room | null>(null);
  const sendStateRef = useRef<((g: Game, peerId?: string) => void) | null>(null);
  const peersRef = useRef<Set<string>>(new Set());
  // Refs mirror state so room callbacks always read current values.
  const roleRef = useRef<SyncRole>("off");
  const gameRef = useRef<Game | null>(game);
  gameRef.current = game;

  const teardown = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    sendStateRef.current = null;
    peersRef.current = new Set();
    setPeerCount(0);
  }, []);

  const startRoom = useCallback(
    (roomCode: string, asRole: SyncRole) => {
      teardown();
      roleRef.current = asRole;

      const room = joinRoom({ appId: APP_ID, password: roomCode }, roomCode);
      roomRef.current = room;

      // The game is sent as a JSON string (a valid DataPayload); a whole-state
      // broadcast keeps sync trivial and is tiny on the wire.
      const action = room.makeAction<string>("state");
      const sendState = (g: Game, target?: string) =>
        action.send(JSON.stringify(g), target ? { target } : undefined);
      sendStateRef.current = sendState;

      action.onMessage = (data) => {
        if (roleRef.current !== "guest") return;
        try {
          setRemoteGame(JSON.parse(data) as Game);
          setStatus("connected");
        } catch {
          /* ignore malformed payload */
        }
      };

      room.onPeerJoin = (peerId) => {
        peersRef.current.add(peerId);
        setPeerCount(peersRef.current.size);
        // Seed a freshly-joined watcher with the current game immediately.
        if (roleRef.current === "host" && gameRef.current) {
          sendState(gameRef.current, peerId);
        }
      };

      room.onPeerLeave = (peerId) => {
        peersRef.current.delete(peerId);
        setPeerCount(peersRef.current.size);
        // A guest whose only peer (the host) left has lost the live feed.
        if (roleRef.current === "guest" && peersRef.current.size === 0) {
          setStatus("disconnected");
        }
      };
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

  const host = useCallback((): string => {
    const newCode = makeCode();
    setRole("host");
    roleRef.current = "host";
    setCode(newCode);
    setRemoteGame(null);
    setStatus("connected"); // "sharing is live"; peerCount shows watchers
    startRoom(newCode, "host");
    if (gameRef.current) sendStateRef.current?.(gameRef.current);
    persist({ role: "host", code: newCode });
    return newCode;
  }, [startRoom]);

  const join = useCallback(
    (joinCode: string) => {
      const norm = joinCode.trim().toUpperCase();
      if (!norm) return;
      setRole("guest");
      roleRef.current = "guest";
      setCode(norm);
      setRemoteGame(null);
      setStatus("connecting");
      startRoom(norm, "guest");
      persist({ role: "guest", code: norm });
    },
    [startRoom],
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
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(SESSION_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as Session;
      if (s.role === "host") host();
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

  // Leave the room when the provider unmounts.
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
