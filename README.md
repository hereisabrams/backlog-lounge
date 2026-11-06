# Backlog Lounge

A game tracker that looks like a retro living room. Every console you own games for sits on the
media cabinet at its real size (flat consoles stack when the cabinet fills up), the old TV plays
the game you're on, and your backlog stands on the bookshelf in platform-correct cases.

Design and spec: the Lovable prototype ("Retro Game Shelf"), spec in [`design/spec.md`](design/spec.md).

## Stack

| Piece | What |
|---|---|
| App | Vite + React 19 + TanStack Router/Query + Tailwind 4 (`src/`) |
| Sign-in and data | Firebase Auth (Google) + Firestore, `users/{uid}/games/{gameId}` behind [`firestore.rules`](firestore.rules) |
| Server functions | Vercel Functions in [`api/`](api) — game search (RAWG), box art lookup, "What to play?" (Claude Haiku via Vercel AI Gateway) |
| Hosting | Vercel |

The functions check the caller's Firebase ID token. "What to play?" reads the caller's backlog through
Firestore's REST API with their own token, so the security rules apply there too. No key reaches the browser.

## Run it

```bash
npm install
npm run dev     # http://localhost:5480, also serves api/* locally
npm test
npm run build
```

### Environment

| Variable | Where | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | `.env` (committed) | Public Firebase web config |
| `RAWG_API_KEY` | Vercel env / `.env.local` | Free key from rawg.io/apidocs; without it search shows a note and you fill games in by hand |
| `AI_GATEWAY_API_KEY` | `.env.local` only | Locally only; on Vercel the functions authenticate to AI Gateway with OIDC automatically |

### Firestore rules

Paste `firestore.rules` into Firebase console → Firestore → Rules, or `firebase deploy --only firestore:rules`.

## How the room works

```
src/components/lounge/RoomScene.tsx   the room: TV, cabinet zones, bookcase, TV light
src/lib/roomLayout.ts                 fits consoles on the cabinet: real size → stack flat ones → shrink
src/lib/consoleArt.ts                 console photos + real widths (cm) + which are flat/stackable
src/lib/caseStyle.ts                  real case sizes (mm) and plastics per platform
src/components/lounge/GameCase.tsx    a box facing out, standing spine-out, or lying in a stack
src/components/lounge/TvScreen.tsx    CRT picture, on-screen display, channel static
```

Covers: picking a search result looks up the game's Steam library art (portrait box + wide hero for
the TV); otherwise the RAWG key art is used. Uploaded covers are resized in the browser and stored in
the game document (Firebase Storage would need the paid plan).
