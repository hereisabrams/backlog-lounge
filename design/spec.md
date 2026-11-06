# Build "Backlog Lounge" — a retro living-room game tracker

You are building a full web app. Read this whole spec first, then implement it end to end.
Where a technology is named, it is a recommendation, not a mandate — but keep the behaviour,
the data model and the visual rules exactly as written.

---

## 1. The idea in one paragraph

A game tracker that looks like a **retro living room**. The user's collection is rendered as a
photorealistic room with an old CRT TV on a wooden media cabinet. Every console the user owns
games for **physically appears on the cabinet** — add a PS5 game and a PS5 shows up next to the
TV. The TV screen shows stats and "now playing" for whichever console is selected, like a channel.
Backlog games sit on a bookshelf at the side of the room, cover-out. There is a separate
"Collection Wall" page: a wall of bookcases, one per console, all covers facing forward.
Everything is warm, chunky, and physical — no generic SaaS dashboard.

Working name: **Backlog Lounge**.

---

## 2. Stack

Use whatever the user's environment prefers. The reference implementation is:

- **TanStack Start v1** (React 19, Vite, file-based routes in `src/routes`) — any React framework is fine.
- **Tailwind CSS v4** with all colors/fonts as CSS custom properties.
- **Postgres + auth + file storage** behind RLS (Supabase, or equivalent).
- **Server-side functions** for anything holding an API key.
- **Vitest** for tests.

Hard rule: **no secret is ever shipped to the browser.** Game search and AI calls go through a
server function / API route that reads the key from the environment.

---

## 3. Data model

One application table, `public.games`:

| column     | type          | notes |
|------------|---------------|-------|
| id         | uuid, pk      | gen_random_uuid() |
| user_id    | uuid, not null| owner; plain uuid, no FK to auth.users |
| title      | text, not null| |
| platform   | text, not null| console name, e.g. "PS5", "Switch", "PC" |
| status     | text, not null| one of `backlog` \| `playing` \| `stopped` \| `done` |
| score      | numeric, null | 0–10, half steps allowed |
| progress   | integer, 0–100, default 0 | |
| price      | numeric, null | what the user paid |
| store      | text, null    | where it was bought |
| cover_url  | text, null    | remote URL or signed storage URL |
| rawg_id    | integer, null | id from the game database, for de-dup |
| notes      | text, null    | "where I left off" |
| created_at / updated_at | timestamptz, default now() | updated_at via trigger |

Constraints: `status IN (...)`, `progress BETWEEN 0 AND 100`, `score BETWEEN 0 AND 10`.
Indexes on `(user_id, status)` and `(user_id, platform)`.

**Row Level Security is mandatory.** Owner-only `select / insert / update / delete` policies
comparing `user_id` to the authenticated uid. Enable RLS on the table. No policy = no access.

Storage: a **private** bucket `covers`. Uploads go to `<user_id>/<uuid>.<ext>`. The app stores a
**signed URL** (long expiry) in `cover_url`. Public buckets may be blocked by the platform, so
assume signed URLs are the normal path.

Auth: email + password, plus Google and one other OAuth provider. Sign-up may require email
confirmation; do not auto-confirm unless asked.

---

## 4. Domain logic (`src/lib/games.ts`)

```ts
type GameStatus = "backlog" | "playing" | "stopped" | "done";
```

- `CONSOLES`: a curated list with a `family` of `ps | xbox | nintendo | pc | retro`
  (PS5, PS4, PS3, PS2, PS1, PS Vita, Xbox Series X|S, Xbox One, Xbox 360, Switch 2, Switch,
  Wii U, Wii, 3DS, GameCube, N64, SNES, PC, Steam Deck, Mobile, Sega Genesis, Dreamcast).
- `consoleFamily(platform)`: exact match first, then substring heuristics, default `retro`.
- `normalizePlatform(rawgName)`: map external platform names ("PlayStation 5" → "PS5",
  "Nintendo Switch" → "Switch", "Xbox Series S/X" → "Xbox Series X|S", iOS/Android → "Mobile").
- `groupByConsole(games) -> ConsoleSummary[]`: `{ name, family, games, done, spent }`,
  sorted by game count desc.
- `formatMoney(n)`: currency, USD.
- `gamesQuery`: TanStack Query options, `select * from games order by updated_at desc`.

**Collection filters** (used by the Collection Wall):

```ts
type CollectionFilters = { console: string; status: string; score: number };
// console/status: "all" or a value. score: 0 = any, -1 = unrated, >0 = minimum score.
DEFAULT_FILTERS = { console: "all", status: "all", score: 0 };
SCORE_FILTERS   = [ {0,"Any"}, {-1,"Unrated"}, {1,"1+"}, {5,"5+"}, {8,"8+"} ];
applyCollectionFilters(games, f) // unknown values are ignored, never crash
isFiltered(f)
```

---

## 5. Screens

### `/` — landing (signed out)
Headline + one-line pitch + "Enter your living room" CTA + an **example room** (labeled
"Example room") built from hard-coded demo consoles (PS5, Switch, Xbox Series X|S, PC).
If a session already exists, **redirect straight to `/room`** — signed-in users should never
see the marketing page.

### `/auth`
Card on a wood-paneled wall. "Continue with Google", "Continue with the other provider", then
`— or —`, then email/password with a Sign in ↔ Create account toggle. OAuth `redirect_uri` must
be a full same-origin URL (`window.location.origin`), never a protected route.

### `/room` — the living room (authenticated)
One slim header line: title · **Room / Organize** toggle · "What to play?" · theme picker ·
"Collection" · **Add game** · sign-out.

**Room view:**
1. `RoomScene` (below).
2. Four stat tiles: Games, Finished, Avg score, Spent.
3. "The whole shelf" / "<Console> shelf" heading with a "show all" link, a title search box,
   and status chips (All / Backlog / Playing / Stopped / Done) each with a live count.
4. Grid of `GameCard`s (cover, console badge, score badge, status pill, progress bar, price · store).
   Empty state: "Nothing here yet. Add a game."

**Organize view:** four columns (Backlog / Playing / Stopped / Done), each a list of small rows
with a `<select>` that moves the game between columns. This is the fast "just move my games" mode.

Both views share one `GameDialog` for add/edit.

### `/collection` — the Collection Wall
A wall of bookcases, one per console, covers facing forward, sorted by game count.
Above them, a wooden filter bar with three chip rows: **Console**, **Status**, **Score**.
- Every chip shows **how many games it would leave**, computed with the *other* filters applied.
- Counts update as filters stack (console=PS5 → status=Done → score=8+).
- "N of M games on the wall" line; **Clear filters** appears once anything is picked.
- Empty result: "No games match these filters" + a clear link. Empty collection: "No games yet."
- Filter state lives in **URL search params** so a filtered wall is bookmarkable.
  Keep `score` a number. Do not use `search.middlewares`/`stripSearchParams` on this route —
  it breaks search-type inference; just let defaults serialize into the URL.

### `/room` "What to play?" dialog
Time chips (30 min, 1 h, 2 h, 4 h) + a free "minutes" number input + "I feel like…" textarea +
a button. Result: cover, title, a two-sentence reason, and "Open game".

---

## 6. The room scene (`RoomScene`) — the heart of the app

Photorealistic, not drawn. Per theme: a **room photo** (1920×1088), a **TV PNG on transparent
background**, and **console PNGs on transparent backgrounds**. All placements are percentage
rectangles so the scene scales with the container.

```ts
type Rect = { l, t, r, b };                       // fractions of the TV image
type Scene = {
  room: string; tv: string;
  tvWidth: number;      // % of scene width
  tvAspect: number;     // h / w of the TV image
  screen: Rect;         // where the picture glass sits inside the TV image
  cabinet: { l, r, top };// % of scene
};
const SCENE_ASPECT = 1088 / 1920;
```

Reference values (measured from the images — re-measure if you swap art):

| theme | room | tv | tvWidth | tvAspect | screen l,t,r,b | cabinet l,r,top |
|---|---|---|---|---|---|---|
| seventies | room-70s.jpg | tv-wood.png | 29 | 971/893 | .085,.32,.745,.795 | 20, 81, 58.6 |
| eighties  | room-80s.jpg | tv-grey.png | 29 | 832/923 | .115,.13,.885,.77  | 20, 80.5, 57 |
| nineties  | room-90s.jpg | tv-grey.png | 26 | 832/923 | .115,.13,.885,.77  | 23.8, 75.2, 59.5 |

Composition rules:
- TV is centred horizontally, sitting **on** the cabinet top: `tvHeightPct = tvWidth * tvAspect / SCENE_ASPECT`,
  `tvTop = cabinet.top + 1 - tvHeightPct`.
- A soft blurred glow rectangle sits on the wall behind the TV.
- Consoles are split **left/right alternating** around the TV (`i % 2 === 0` → left). Each zone
  is the space between the cabinet edge and the TV; console widths are proportional and scaled
  down (`k = min(1, zoneWidth / totalNeeded)`) so they never overflow.
- Each console: a PNG with a drop shadow, a ground shadow ellipse under it, and a floating pill
  label `NAME · n` (always visible when selected, on hover otherwise). Clicking a console selects
  its "channel"; clicking again deselects.
- **Light grading** so PNGs sit in the photo's lighting — a per-theme CSS `filter`
  (sepia/saturate/brightness/hue-rotate) plus a `mix-blend-color` tint layer masked to the
  console silhouette.
- Backlog shelf: a `BookcaseFrame` pinned to the left of the scene
  (`left 1.5%, width 15%, top 16%, bottom 8%`) with a `BACKLOG · n` label and 4 dense rows of 4
  backlog covers; clicking one opens that game.
- No consoles: a pulsing "+ plug in a console" button over the cabinet.

Console art mapping: `ps5` → PS5 art; other `ps` → PS4 art; `xbox` → Series X art;
`snes|n64|gamecube` or `retro` → SNES art; other `nintendo` → docked Switch art; else → PC tower.

**The TV screen** is an absolutely positioned rounded rectangle inside the TV image, with
`container-type: size` so its text can size in `cqw`/`cqh`. Content:

```
CH·PS5                      62%
GAMES 12   DONE 7   $210.00
-----------------------------
NOW PLAYING
Astro Bot        ███░░  72%
— nothing on —
◀ CH                    CH ▶
```
- `NO SIGNAL` + "▶ ADD YOUR FIRST GAME" when there are no games.
- CRT overlay: radial screen gradient, inset shadow, scanline `::after` with a flicker animation,
  glowing text.
- `◀ CH` / `CH ▶` cycle through `null` (all consoles) then each console in order.

`BookcaseFrame`: dark wood frame, 6px border, inner vertical gradient.
`ShelfRow`: boxes with `aspect-[3/4]`, cover image (slightly desaturated), a spine-side gradient
overlay, hover lift, and a wooden plank underneath. No cover → the title in display type.

---

## 7. Themes

Three room moods, switched by `data-theme` on `<html>` and persisted to `localStorage`
(`room-theme`). **Every color and font is a token** — adding a theme must only mean adding a
token block.

```
seventies  "’70s Den"      Shrikhand + Outfit   amber/wood, radius .9rem, chunky offset shadow
eighties   "’80s Neon"     Audiowide + Outfit   dark violet + hot pink/cyan, radius .4rem, neon glow shadow
nineties   "’90s Bedroom"  Bungee + Outfit      cool grey/blue, radius .25rem, hard 3px shadow
```

Token set per theme: `--background --foreground --card --popover --primary --secondary --accent
--muted --destructive --border --input --ring --wall --wall-pattern --floor --wood --wood-dark
--shelf-label --tv-body --tv-trim --screen --screen-text --screen-dim --screen-glow --lamp-glow
--shadow-chunky --radius --font-display-family --font-body-family`.

Shared (theme-independent): `--status-backlog --status-playing --status-stopped --status-done`
and `--console-ps --console-xbox --console-nintendo --console-pc --console-retro`.

Utilities built from tokens: `font-display`, `shadow-chunky`, `room-wall` (lamp glow + wall
pattern over wall color), `room-floor`, `wood`, `tv-body`, `crt`, `screen-glow-text`, `cable-live`.

Load fonts with a `<link>` in the document head (Google Fonts: Shrikhand, Audiowide, Bungee,
Outfit, VT323) — never `@import` a remote URL in the main stylesheet.

---

## 8. Add / edit game (`GameDialog`)

One dialog for both. When **adding**, the first field is a game search box:
- Debounced 350 ms, fires at ≥2 characters, shows a results dropdown
  (cover thumb, name, year, platforms).
- Picking a result fills title, cover and `rawg_id`, and offers the result's platforms as chips;
  the first becomes the console.
- If search is unavailable (no key, quota, outage), show the reason inline and **still let the
  user fill everything in by hand** — search is an accelerator, never a gate.

Fields: cover (Upload / paste-link), Title, Console (input + datalist of known consoles +
platform hints), Status (4 buttons), Progress (slider, step 5), Score /10, Paid, Bought at
(datalist of common stores), Notes.

Save rules: title and platform required; score clamped 0–10 and blank → null; price blank → null;
**status `done` with progress 0 auto-sets progress to 100**; strings trimmed, empty → null.
Editing shows a destructive **Remove** button. Toast on success/failure; invalidate the games query.

Store list: PlayStation Store, Xbox Store, Nintendo eShop, Steam, Epic, GOG, Amazon, GameStop,
Best Buy, Walmart, Target, Used / Garage sale, Gift.

---

## 9. Game search (server function)

`searchGames({ query })` — authenticated server function.
- Reads `RAWG_API_KEY` from the environment; if missing, return
  `{ results: [], error: "Game search isn't set up yet — add your RAWG key." }`.
- Trims the query to 100 chars.
- `GET https://api.rawg.io/api/games?key=…&search=…&page_size=8&search_precise=true`.
- Map to `{ id, name, released, cover, platforms[] }` (platform names normalized client-side).
- Non-2xx: log the body server-side, return a friendly error string.

---

## 10. AI "what to play?" (server function)

`recommendGame({ minutes, mood })` — authenticated server function.
1. Validate: `minutes` clamped 5–1440 (default 60), `mood` trimmed to 500 chars.
2. Read the caller's own `backlog` + `stopped` games (max 200) **through RLS**, selecting
   `id,title,platform,status,progress,notes`. Empty → "Your backlog is empty — add a game first."
3. Build a compact list: `- id=… | title | platform | status | 45% | notes: …`.
4. Call the model with instructions along these lines:

   > You recommend one game from the player's backlog. Consider typical session length, genre and
   > the player's mood. Only pick from the list. Reply with ONLY JSON:
   > `{"id":"<id>","reason":"<2 short friendly sentences, mention why it fits the time and mood>"}`

   User message: `I have <n> minutes. I feel like: <mood or "anything">\n\nBacklog:\n<list>`
5. Parse defensively (slice from the first `{` to the last `}`), fall back to the first game if
   the returned id is unknown, and never trust the model's title — look the game up locally.
6. Map failures to human messages: out of credits, rate limited, generic.

The prompt and the key stay server-side; the browser only sends minutes + mood.

---

## 11. Behaviour details that matter

- Auth state changes invalidate the router and the query cache (sign-out must clear cached games).
- Sign-out cancels in-flight queries, clears the cache, then navigates to `/auth`.
- Every route has its own `<title>`/description/og tags; the landing og:image should be the room.
- 404 copy: "No signal on this channel".
- Toasts for save/remove/move failures.
- The room scales down as a unit on small screens; keep the scene's aspect ratio intact.
- Keyboard/ARIA: console buttons carry `aria-label="<name>, <n> games"` and `aria-pressed`;
  filter groups use `role="group"` + `aria-label="<Label> filter"`; chips use `aria-pressed`.

---

## 12. Tests

Write unit tests for the pure logic, no UI snapshots:
- `applyCollectionFilters`: single filters, stacked combinations, unrated, minimum score,
  unknown values ignored, empty result.
- `consoleFamily`, `normalizePlatform`, `groupByConsole` (done count, spent total, ordering).
- Save-rule helpers (done ⇒ progress 100, score clamp, blank ⇒ null).

---

## 13. Later phases (do not build now, but leave room for them)

- Google Sheets two-way sync.
- HowLongToBeat play times (no official API — assume scraping that can break).
- Per-console wall papers, more rooms, more consoles.

---

## 14. Assets needed

Room photos (1920×1088): wood-paneled '70s living room with shag rug and floor lamp, empty
walnut media cabinet; neon '80s room with synthwave skyline, empty black lacquer cabinet;
'90s bedroom with posters and beanbag, empty light-wood cabinet.
Transparent PNGs: a wooden CRT TV with rabbit ears, a grey '90s CRT, and consoles
(PS5, PS4, Xbox Series X, docked Switch, SNES, mini PC tower). Generate or source these; place
the screen rectangle in `SCENES` by measuring the actual image, not by guessing.
