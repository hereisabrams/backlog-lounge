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
| Server functions | Vercel Functions in [`api/`](api) — game search, box art and time-to-beat (IGDB), "What to play?" (Claude Haiku via Vercel AI Gateway) |
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
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Vercel env / `.env.local` | IGDB runs on a free Twitch developer app (dev.twitch.tv/console/apps); without them search shows a note and you fill games in by hand |
| `FIREBASE_PROJECT_ID` | Vercel env | `backlog-lounge`; the functions verify Firebase tokens against it |
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

Covers and play times: picking a search result stores IGDB's box art, wide art for the TV, and IGDB's
time-to-beat (rushed / normal / 100%), which drives the "h left" on cards and the "What to play?" pick.
Uploaded covers are resized in the browser and stored in the game document (Firebase Storage would need
the paid plan).

HowLongToBeat: each game links to its HowLongToBeat search. There is no automatic sync: HowLongToBeat's
terms (Ziff Davis) forbid automated access without written permission.
