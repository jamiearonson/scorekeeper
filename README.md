# Scorekeeper

A fast, mobile-first **PWA for keeping score** in turn/round-based group games.
Built generic so new games are added by dropping in a single file — ships today with
**Golf** (lowest total wins) and **Farkle** (highest total wins, race to a target).

- 📱 Mobile-only layout, big tap targets, one-sheet score entry for the whole group
- 💾 No backend — the active game is saved to `localStorage` and survives refreshes
- ⚡ Installable PWA, works offline after first load
- 🔁 "Play again — same players" to restart instantly
- 📡 **Live score sharing** — others scan a QR / enter a code to watch the score update in real time
- 💾 **Saved history & occasions** — games persist to Supabase (per device) and group into named occasions

## Persistence & occasions (Supabase)

Games auto-save to Supabase so they survive cleared storage and build a history, and they
group into named **occasions** (e.g. "Camping 2026") with a "most wins" tally. There's **no
login**: each device silently gets an **anonymous** Supabase identity, and row-level security
keeps its data private. `localStorage` stays the offline-first copy of the active game; Supabase
writes are best-effort (offline never blocks play). One device is the **scorekeeper** that owns
and saves the games; others join the live share for a read-only scoreboard. (Sharing one occasion
across devices would need email login — a future option.)

**Setup (once, in the Supabase dashboard):**
1. **Authentication → Providers → enable "Allow anonymous sign-ins."**
2. **SQL Editor → run** [`supabase/schema.sql`](supabase/schema.sql) (creates `groups` + `games`
   with row-level security).

Client config is in [`src/lib/supabaseClient.ts`](src/lib/supabaseClient.ts) (publishable key
only). Persistence/auth live in [`src/lib/persistence.ts`](src/lib/persistence.ts) and
[`src/lib/auth.ts`](src/lib/auth.ts); auto-save in [`src/components/GameSync.tsx`](src/components/GameSync.tsx).

## Live sharing (Supabase Realtime)

The scorekeeper taps **Share** on the Play screen to get a game code + QR. Others scan it
(or enter the code on Home → **Join a game**) to watch the scorecard update live as scores are
entered. The app still deploys as a plain static site to GitHub Pages — the only external piece
is **[Supabase Realtime](https://supabase.com/realtime)** acting as a message relay:

- Every device opens **one** WebSocket to a shared channel (`scorekeeper:<code>`) and the host
  **broadcasts** the whole game on each change; guests subscribe and apply it. Because messages
  relay through Supabase (not peer-to-peer), it works for any number of watchers on any network.
- **Presence** tracks the live watcher count. The host is the source of truth; guests get a
  **read-only** live view. See [`src/lib/sync.tsx`](src/lib/sync.tsx).

Config lives in [`src/lib/supabaseClient.ts`](src/lib/supabaseClient.ts) and uses only the
**publishable (anon) key**, which is safe to ship in client code. The `sb_secret_…` key must
never be committed. No database tables are needed for live sync (Broadcast/Presence are
ephemeral) — but since Supabase includes Postgres, persisting finished games later is just a
table write, no new service. Guest-side score entry (send a score action back to the host) is a
natural next step.

## Stack

- Vite + React + TypeScript (client-side SPA)
- Tailwind CSS v4 + shadcn/ui (new-york)
- react-router-dom (HashRouter — deploys to any static host, no rewrite rules)
- vite-plugin-pwa (manifest + offline service worker, auto-update)

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # type-check + production build to dist/
pnpm preview      # serve the built app locally
```

Open it in your browser's mobile device toolbar — the UI is designed for a phone width.

## Deploy (free hosting)

`pnpm build` produces a fully static `dist/`. Because routing is hash-based, it works on
**any** host with zero server config:

- **GitHub Pages** — publish `dist/`; no SPA fallback needed.
- **Netlify** — drag `dist/` into the dashboard, or `netlify deploy --dir=dist --prod`.
- **Vercel** — import the repo (build `pnpm build`, output `dist`), or `vercel deploy`.
- **Cloudflare Pages** — build command `pnpm build`, output directory `dist`.

Then open the site on your phone and "Add to Home Screen" to install it.

## How the game engine works

Everything game-specific lives behind one interface; the rest of the app is generic.

```
src/lib/
  types.ts          # GameDefinition, Game, Round, SetupField, Standing
  scoring.ts        # generic totals / standings / winners (uses scoreDirection)
  store.tsx         # GameProvider + useGame() — state + localStorage persistence
  games/
    index.ts        # the registry: { golf, farkle } + per-game icons
    golf.ts         # GameDefinition (low wins, fixed holes)
    farkle.ts       # GameDefinition (high wins, open-ended, target score)
```

### Adding a new game

1. Create `src/lib/games/<game>.ts` exporting a `GameDefinition`:
   - `scoreDirection: "low" | "high"` — how a winner is decided (scoring is generic).
   - `roundLabel` / `roundLabelPlural` — e.g. `"Hole"` or `"Round"`.
   - `setupFields` — config collected on the setup screen (renders automatically).
   - `totalRounds(config)` — a number for fixed-length games, or `null` for open-ended.
   - `validateScore`, `isComplete`, optional `describeGoal`.
2. Register it in `src/lib/games/index.ts` (`GAMES` + `GAME_ICONS`).

That's it — the setup form, scorecard, leaderboard, score-entry sheet, persistence, and
winner screen all work without further changes.

## Screens

- **Home** — resume the in-progress game or start a new one.
- **New Game** — pick a game → configure (holes / target / custom) → name players.
- **Play** — leaderboard + scorecard grid; tap **Enter <round>** for the all-players entry
  sheet, or tap any row to edit. Finish to lock in the winner, then play again.
