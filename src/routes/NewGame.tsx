import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronUp, GripVertical, Plus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/lib/store";
import { GAME_LIST, GAMES, GAME_ICONS } from "@/lib/games";
import type { SetupField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type React from "react";

export default function NewGame() {
  const navigate = useNavigate();
  const { startGame, lastPlayers, lastGameType, favorites, addFavorite, removeFavorite } =
    useGame();

  const [gameType, setGameType] = useState<string>(
    () => (lastGameType && GAMES[lastGameType] ? lastGameType : GAME_LIST[0].id),
  );
  const def = GAMES[gameType];

  // Config defaults, recomputed when the chosen game changes.
  const [config, setConfig] = useState<Record<string, number>>(() =>
    Object.fromEntries(def.setupFields.map((f) => [f.key, f.default])),
  );

  const [players, setPlayers] = useState<string[]>(() =>
    lastPlayers.length >= 2 ? [...lastPlayers] : ["", ""],
  );

  function pickGame(id: string) {
    setGameType(id);
    const next = GAMES[id];
    setConfig(Object.fromEntries(next.setupFields.map((f) => [f.key, f.default])));
  }

  function setField(key: string, value: number) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function updatePlayer(i: number, name: string) {
    setPlayers((p) => p.map((n, idx) => (idx === i ? name : n)));
  }
  function addPlayer() {
    setPlayers((p) => [...p, ""]);
  }
  function removePlayer(i: number) {
    setPlayers((p) => (p.length <= 1 ? p : p.filter((_, idx) => idx !== i)));
  }
  function moveUp(i: number) {
    if (i === 0) return;
    setPlayers((p) => {
      const next = [...p];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function hasPlayer(name: string) {
    const n = name.trim().toLowerCase();
    return players.some((p) => p.trim().toLowerCase() === n);
  }

  // Tap a saved favorite to drop it into the lineup: fill the first blank row, else append.
  function addFromFavorite(name: string) {
    if (hasPlayer(name)) return;
    setPlayers((p) => {
      const blank = p.findIndex((n) => n.trim() === "");
      if (blank === -1) return [...p, name];
      return p.map((n, idx) => (idx === blank ? name : n));
    });
  }

  function toggleFavorite(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (favorites.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      removeFavorite(trimmed);
    } else {
      addFavorite(trimmed);
    }
  }

  function isFavorited(name: string) {
    const n = name.trim().toLowerCase();
    return n !== "" && favorites.some((f) => f.toLowerCase() === n);
  }

  // Always startable — blank rows fall back to "Player N" so a quick game needs no typing.
  const canStart = players.length >= 1;

  function handleStart() {
    if (!canStart) {
      toast.error("Add at least one player");
      return;
    }
    const names = players.map((n, i) => n.trim() || `Player ${i + 1}`);
    startGame({ gameType, config, playerNames: names });
    navigate("/play");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <header className="bg-background/80 sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-semibold">New Game</h1>
      </header>

      <div className="flex flex-col gap-7 px-5 py-6">
        {/* 1. Pick a game */}
        <section className="flex flex-col gap-3">
          <SectionTitle step={1} title="Choose a game" />
          <div className="grid grid-cols-2 gap-3">
            {GAME_LIST.map((g) => {
              const Icon = GAME_ICONS[g.id];
              const active = g.id === gameType;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => pickGame(g.id)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition active:scale-[0.98]",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{g.name}</p>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {g.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Configure */}
        <section className="flex flex-col gap-4">
          <SectionTitle step={2} title="Set it up" />
          {def.setupFields.map((field) => (
            <SetupFieldRow
              key={field.key}
              field={field}
              value={config[field.key]}
              onChange={(v) => setField(field.key, v)}
            />
          ))}
          {def.describeGoal && (
            <p className="text-muted-foreground rounded-lg bg-secondary/60 px-3 py-2 text-sm">
              🏁 {def.describeGoal(config)}
            </p>
          )}
        </section>

        {/* 3. Players */}
        <section className="flex flex-col gap-3">
          <SectionTitle step={3} title="Players" />
          <div className="flex flex-col gap-2">
            {players.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-muted-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  {i === 0 ? (
                    <GripVertical className="size-5" />
                  ) : (
                    <ChevronUp className="size-5" />
                  )}
                </button>
                <Input
                  value={name}
                  placeholder={`Player ${i + 1}`}
                  onChange={(e) => updatePlayer(i, e.target.value)}
                  className="h-11 flex-1"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => toggleFavorite(name)}
                  disabled={name.trim() === ""}
                  aria-label={isFavorited(name) ? "Remove from favorites" : "Save as favorite"}
                  aria-pressed={isFavorited(name)}
                >
                  <Star
                    className={cn(
                      "size-5",
                      isFavorited(name)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground",
                    )}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground shrink-0"
                  onClick={() => removePlayer(i)}
                  disabled={players.length <= 1}
                  aria-label="Remove player"
                >
                  <X className="size-5" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addPlayer} className="h-11">
            <Plus className="size-4" />
            Add player
          </Button>

          {favorites.length > 0 && (
            <div className="flex flex-col gap-2 pt-1">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Favorites
              </p>
              <div className="flex flex-wrap gap-2">
                {favorites.map((name) => {
                  const added = hasPlayer(name);
                  return (
                    <Chip
                      key={name}
                      active={added}
                      onClick={() => addFromFavorite(name)}
                    >
                      <Star
                        className={cn(
                          "size-3.5",
                          added ? "fill-current" : "fill-yellow-400 text-yellow-400",
                        )}
                      />
                      {name}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="bg-background/80 sticky bottom-0 mt-auto border-t px-5 py-4 backdrop-blur pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          size="lg"
          className="h-14 w-full text-base"
          onClick={handleStart}
          disabled={!canStart}
        >
          Start Game
        </Button>
      </footer>
    </div>
  );
}

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
        {step}
      </span>
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}

function SetupFieldRow({
  field,
  value,
  onChange,
}: {
  field: SetupField;
  value: number;
  onChange: (value: number) => void;
}) {
  const presets = (field.options ?? []).filter((o) => o.value !== null);
  const hasCustom = (field.options ?? []).some((o) => o.value === null);
  const isPreset = presets.some((o) => o.value === value);
  const customActive = hasCustom && !isPreset;

  if (field.type === "number" || !field.options) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{field.label}</Label>
        <Input
          type="text"
          inputMode="numeric"
          value={String(value)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="h-11 max-w-32"
        />
        {field.hint && (
          <p className="text-muted-foreground text-xs">{field.hint}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{field.label}</Label>
      <div className="flex flex-wrap gap-2">
        {presets.map((o) => (
          <Chip
            key={o.label}
            active={!customActive && o.value === value}
            onClick={() => onChange(o.value as number)}
          >
            {o.label}
          </Chip>
        ))}
        {hasCustom && (
          <Chip
            active={customActive}
            onClick={() => onChange(customActive ? value : field.default + 1)}
          >
            Custom
          </Chip>
        )}
      </div>
      {customActive && (
        <Input
          type="text"
          inputMode="numeric"
          autoFocus
          value={String(value)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="h-11 max-w-32"
          aria-label={`Custom ${field.label}`}
        />
      )}
      {field.hint && <p className="text-muted-foreground text-xs">{field.hint}</p>}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-w-14 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      {children}
    </button>
  );
}
