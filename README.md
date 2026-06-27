# Scorekeeper

A fast, mobile-first **PWA for keeping score** in turn/round-based group games.
Built generic so new games are added by dropping in a single file — ships today with
**Golf** (lowest total wins) and **Farkle** (highest total wins, race to a target).

- 📱 Mobile-only layout, big tap targets, one-sheet score entry for the whole group
- 💾 No backend — the active game is saved to `localStorage` and survives refreshes
- ⚡ Installable PWA, works offline after first load
- 🔁 "Play again — same players" to restart instantly
- 📡 **Live score sharing** — others scan a QR / enter a code to watch the score update in real time

## Live sharing (serverless P2P)

The scorekeeper taps **Share** on the Play screen to get a game code + QR. Others scan it
(or enter the code on Home → **Join a game**) to watch the scorecard update live as scores are
entered. It uses **WebRTC peer-to-peer** via [Trystero](https://github.com/dmotz/trystero) —
peer discovery rides public Nostr relays, so there is **no server or database of our own** and
it still deploys to plain static hosting. The host's device is the source of truth; guests get a
**read-only** live view. See [`src/lib/sync.tsx`](src/lib/sync.tsx).

Notes: works best when players share Wi-Fi/a hotspot (the common in-person case); across
restrictive/mixed cellular networks a TURN relay (not configured here) may be needed. Letting
guests enter their own scores is a natural next step (send a score action back to the host).

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
