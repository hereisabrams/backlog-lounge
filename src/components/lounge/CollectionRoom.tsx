import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { caseStyle, shelfName } from "@/lib/caseStyle";
import type { ConsoleSummary, Game } from "@/lib/games";
import type { RoomTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ShelfCase, SpineFace } from "./GameCase";
import { SCENE_ASPECT, SCENES } from "./RoomScene";

/** IKEA Kallax-style cube: 335 mm inside, boards 38 mm thick. */
const CUBBY_MM = 335;
const BOARD = 38 / CUBBY_MM;
const USABLE_MM = CUBBY_MM - 16;
const SCENE_HEIGHT = 100 * SCENE_ASPECT;

type Light = { x: number; y: number; color: string };

/** Where the unit stands in each room photo and where its light comes from (scene %). */
/** The shelving's finish in each room: walnut in the den, black lacquer under the neon, birch in the bedroom. */
type Finish = { wood: string; dark: string; gloss: number };

const ROOMS: Record<RoomTheme, { floor: number; eye: number; light: Light; ambient: string; finish: Finish }> = {
  seventies: {
    floor: 90,
    eye: 46,
    light: { x: 86, y: 24, color: "oklch(0.85 0.13 75 / 0.38)" },
    ambient: "oklch(0.25 0.05 50 / 0.35)",
    finish: { wood: "oklch(0.4 0.075 48)", dark: "oklch(0.24 0.045 42)", gloss: 0.08 },
  },
  eighties: {
    floor: 88,
    eye: 44,
    light: { x: 12, y: 12, color: "oklch(0.7 0.22 350 / 0.32)" },
    ambient: "oklch(0.2 0.08 290 / 0.4)",
    finish: { wood: "oklch(0.2 0.012 290)", dark: "oklch(0.12 0.01 290)", gloss: 0.22 },
  },
  nineties: {
    floor: 86,
    eye: 44,
    light: { x: 8, y: 38, color: "oklch(0.9 0.08 85 / 0.3)" },
    ambient: "oklch(0.25 0.04 250 / 0.3)",
    finish: { wood: "oklch(0.74 0.045 78)", dark: "oklch(0.55 0.045 70)", gloss: 0.1 },
  },
};

const WOOD_GRAIN =
  "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.07) 0 1px, transparent 1px 6px), repeating-linear-gradient(88deg, rgb(255 255 255 / 0.035) 0 2px, transparent 2px 13px)";

const filingTitle = (title: string) => title.replace(/^the\s+/i, "").toLowerCase();

type Cubby = { console: string; games: Game[]; isFirst: boolean; total: number };

/** Files each console into its own run of cubbies, A–Z, as many cases as fit side by side. */
export function fileIntoCubbies(consoles: ConsoleSummary[]): Cubby[] {
  return consoles.flatMap((c) => {
    const filed = [...c.games].sort((a, b) => filingTitle(a.title).localeCompare(filingTitle(b.title)));
    const cubbies: Game[][] = [[]];
    let width = 0;
    for (const game of filed) {
      const depth = caseStyle(game.platform).depth + 1;
      if (width + depth > USABLE_MM && cubbies.at(-1)!.length) {
        cubbies.push([]);
        width = 0;
      }
      cubbies.at(-1)!.push(game);
      width += depth;
    }

    return cubbies.map((games, i) => ({ console: c.name, games, isFirst: i === 0, total: c.games.length }));
  });
}

function unitShape(count: number) {
  const cols = count <= 8 ? 4 : count <= 15 ? 5 : count <= 24 ? 6 : 8;
  const rows = Math.max(2, Math.ceil(count / cols));

  return { cols, rows };
}

type Props = { theme: RoomTheme; consoles: ConsoleSummary[]; onPick: (game: Game) => void };

/** The collection room: a cube shelving unit against the room's wall, walk up to a cubby to read and pull cases. */
export function CollectionRoom({ theme, consoles, onPick }: Props) {
  const scene = SCENES[theme];
  const room = ROOMS[theme];
  const cubbies = useMemo(() => fileIntoCubbies(consoles), [consoles]);
  const { cols, rows } = unitShape(cubbies.length);
  const [focus, setFocus] = useState<number | null>(null);

  // Unit size in scene units (width = 100): as wide as fits under the ceiling, at most 74% of the wall.
  const widthUnits = cols + (cols + 1) * BOARD;
  const heightUnits = rows + (rows + 1) * BOARD;
  const maxHeight = ((room.floor - 6) / 100) * SCENE_HEIGHT;
  const cube = Math.min(74 / widthUnits, maxHeight / heightUnits);
  const unit = { w: cube * widthUnits, h: cube * heightUnits };
  const left = 50 - unit.w / 2;
  const top = (room.floor / 100) * SCENE_HEIGHT - unit.h;

  const cubbyRect = (index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = left + cube * (BOARD + col * (1 + BOARD));
    const y = top + cube * (BOARD + row * (1 + BOARD));

    return { x, y, w: cube, h: cube };
  };

  useEffect(() => {
    if (focus != null && focus >= cubbies.length) setFocus(null);
  }, [cubbies.length, focus]);

  useEffect(() => {
    if (focus == null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocus(null);
      if (event.key === "ArrowRight") setFocus((f) => (f == null ? f : Math.min(cubbies.length - 1, f + 1)));
      if (event.key === "ArrowLeft") setFocus((f) => (f == null ? f : Math.max(0, f - 1)));
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [focus, cubbies.length]);

  const camera = (() => {
    if (focus == null) return "translate(0, 0) scale(1)";

    const r = cubbyRect(focus);
    const scale = Math.min(100 / (r.w * 1.6), SCENE_HEIGHT / (r.h * 1.35));
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    return `translate(${50 - cx * scale}%, ${(50 - (cy / SCENE_HEIGHT) * 100 * scale)}%) scale(${scale})`;
  })();

  const focused = focus == null ? null : cubbies[focus];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-4 border-wood-dark shadow-chunky select-none">
      <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: "1920 / 1088" }}>
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] motion-reduce:transition-none"
          style={{ transform: camera }}
        >
          <img
            src={scene.room}
            alt=""
            className={cn("absolute inset-0 h-full w-full object-cover transition-[filter] duration-700", focus != null && "brightness-[0.55] blur-[1px]")}
          />

          <div
            className="pointer-events-none absolute rounded-[50%] bg-black/70 blur-[1.2cqw]"
            style={{ left: `${left - 1}%`, width: `${unit.w + 2}%`, top: `${room.floor - 2.2}%`, height: "4%" }}
          />

          <div
            className="absolute"
            style={{
              left: `${left}%`,
              width: `${unit.w}%`,
              top: `${(top / SCENE_HEIGHT) * 100}%`,
              height: `${(unit.h / SCENE_HEIGHT) * 100}%`,
              filter: scene.grade.replace(/brightness\(([\d.]+)\)/, (_, b) => `brightness(${Math.min(1, Number(b) + 0.14)})`),
              ["--wood" as string]: room.finish.wood,
              ["--wood-dark" as string]: room.finish.dark,
              ["--gloss" as string]: String(room.finish.gloss),
            }}
          >
            <ShelvingUnit
              cols={cols}
              rows={rows}
              cube={cube}
              left={left}
              top={top}
              eye={room.eye}
              cubbies={cubbies}
              focus={focus}
              onFocus={setFocus}
              onPick={onPick}
            />
            <div
              className="pointer-events-none absolute inset-0 mix-blend-soft-light"
              style={{
                background: `radial-gradient(circle at ${((room.light.x - left) / unit.w) * 100}% ${((room.light.y / 100) * SCENE_HEIGHT - top) / unit.h * 100}%, ${room.light.color}, transparent 70%), linear-gradient(180deg, transparent 40%, ${room.ambient})`,
              }}
            />
          </div>

          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 75% at 50% 45%, transparent 55%, rgb(0 0 0 / 0.45) 100%)" }}
          />
        </div>

        {focused ? (
          <>
            <button
              type="button"
              onClick={() => setFocus(null)}
              className="absolute left-[2%] top-[3%] z-40 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/75 sm:text-sm"
            >
              <ArrowLeft className="size-4" /> Back to the room
            </button>
            <p className="absolute right-[2%] top-[3%] z-40 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm sm:text-sm">
              {shelfName(focused.console)} · shelf {cubbies.filter((c, i) => c.console === focused.console && i <= focus!).length} of{" "}
              {cubbies.filter((c) => c.console === focused.console).length}
            </p>
            <NavArrow side="left" disabled={focus === 0} onClick={() => setFocus((f) => Math.max(0, (f ?? 0) - 1))} />
            <NavArrow side="right" disabled={focus === cubbies.length - 1} onClick={() => setFocus((f) => Math.min(cubbies.length - 1, (f ?? 0) + 1))} />
          </>
        ) : (
          cubbies.length > 0 && (
            <p className="pointer-events-none absolute bottom-[2.5%] left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/90 backdrop-blur-sm sm:text-xs">
              Click a shelf to walk up to it
            </p>
          )
        )}
      </div>
    </div>
  );
}

function NavArrow({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous shelf" : "Next shelf"}
      className={cn(
        "absolute top-1/2 z-40 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-[opacity,background-color] hover:bg-black/75 disabled:opacity-0 sm:size-11",
        side === "left" ? "left-[2%]" : "right-[2%]",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function ShelvingUnit({
  cols,
  rows,
  cube,
  left,
  top,
  eye,
  cubbies,
  focus,
  onFocus,
  onPick,
}: {
  cols: number;
  rows: number;
  cube: number;
  left: number;
  top: number;
  eye: number;
  cubbies: Cubby[];
  focus: number | null;
  onFocus: (index: number) => void;
  onPick: (game: Game) => void;
}) {
  const track = (n: number) => `${BOARD}fr ${Array.from({ length: n }, () => `1fr ${BOARD}fr`).join(" ")}`;

  return (
    <div
      className="absolute inset-0 grid rounded-[0.15cqw]"
      style={{
        gridTemplateColumns: track(cols),
        gridTemplateRows: track(rows),
        background: `linear-gradient(105deg, transparent 30%, rgb(255 255 255 / var(--gloss)) 45%, transparent 60%), ${WOOD_GRAIN}, linear-gradient(180deg, color-mix(in oklab, var(--wood) 92%, white), var(--wood) 30%, color-mix(in oklab, var(--wood) 85%, black))`,
        boxShadow: "0 0.4cqw 1.2cqw rgb(0 0 0 / 0.5), inset 0 0.1cqw 0 rgb(255 255 255 / 0.18), inset 0 -0.15cqw 0 rgb(0 0 0 / 0.35)",
      }}
    >
      {Array.from({ length: cols * rows }, (_, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const centerX = left + cube * (BOARD + col * (1 + BOARD) + 0.5);
        const centerY = ((top + cube * (BOARD + row * (1 + BOARD) + 0.5)) / SCENE_HEIGHT) * 100;

        return (
          <CubbyCell
            key={index}
            style={{ gridColumn: 2 + col * 2, gridRow: 2 + row * 2 }}
            cube={cube}
            dx={(centerX - 50) / 50}
            dy={(centerY - eye) / 50}
            cubby={cubbies[index] ?? null}
            isFocused={focus === index}
            isZoomed={focus != null}
            onFocus={() => onFocus(index)}
            onPick={onPick}
          />
        );
      })}
    </div>
  );
}

/**
 * One cube seen from where the visitor stands: the inner side wall and shelf surface facing them, a shadowed
 * back panel, and the games standing on the shelf. dx/dy are the cube's offset from the eye, -1…1.
 */
function CubbyCell({
  style,
  cube,
  dx,
  dy,
  cubby,
  isFocused,
  isZoomed,
  onFocus,
  onPick,
}: {
  style: CSSProperties;
  cube: number;
  dx: number;
  dy: number;
  cubby: Cubby | null;
  isFocused: boolean;
  isZoomed: boolean;
  onFocus: () => void;
  onPick: (game: Game) => void;
}) {
  const wallL = dx < 0 ? Math.min(20, -dx * 22) : 0;
  const wallR = dx > 0 ? Math.min(20, dx * 22) : 0;
  const ceiling = dy < 0 ? Math.min(18, -dy * 20) : 0;
  const floor = dy > 0 ? Math.min(18, dy * 20) : 0;
  const back = { l: wallL, r: wallR, t: ceiling, b: floor };
  const used = cubby ? cubby.games.reduce((sum, g) => sum + caseStyle(g.platform).depth + 1, 0) : 0;
  const leans = cubby != null && cubby.games.length > 1 && used < USABLE_MM * 0.8;
  const label = cubby?.isFirst ? `${cubby.total} ${cubby.total === 1 ? "game" : "games"}` : null;

  const inside = (
    <>
      <span
        className="absolute"
        style={{
          left: `${back.l}%`,
          right: `${back.r}%`,
          top: `${back.t}%`,
          bottom: `${back.b}%`,
          background: `linear-gradient(180deg, rgb(0 0 0 / 0.62), rgb(0 0 0 / 0.38) 35%, rgb(0 0 0 / 0.5)), ${WOOD_GRAIN}, var(--wood-dark)`,
          boxShadow: "inset 0 1.2cqw 1cqw -0.6cqw rgb(0 0 0 / 0.7)",
        }}
      />
      {wallL > 0 && <Face points={`0 0, ${back.l} ${back.t}, ${back.l} ${100 - back.b}, 0 100`} shade={0.32} />}
      {wallR > 0 && <Face points={`100 0, ${100 - back.r} ${back.t}, ${100 - back.r} ${100 - back.b}, 100 100`} shade={0.4} />}
      {ceiling > 0 && <Face points={`0 0, 100 0, ${100 - back.r} ${back.t}, ${back.l} ${back.t}`} shade={0.55} />}
      {floor > 0 && <Face points={`0 100, ${back.l} ${100 - back.b}, ${100 - back.r} ${100 - back.b}, 100 100`} shade={0.08} />}

      {cubby && (
        <span
          className={cn("absolute inset-x-[5%] flex items-end gap-[0.06cqw]", !isFocused && "pointer-events-none")}
          style={{ bottom: `${Math.max(1.5, floor * 0.35)}%`, ["--mm" as string]: `calc(${cube}cqw / ${CUBBY_MM})` }}
        >
          {cubby.games.map((game, i) => {
            const isLeaning = leans && i === cubby.games.length - 1;

            return (
              <span
                key={game.id}
                className="relative block"
                style={isLeaning ? { rotate: "-8deg", transformOrigin: "bottom right", marginLeft: "1.2%" } : undefined}
              >
                {isFocused ? <ShelfCase game={game} onPick={onPick} /> : <StaticSpine game={game} />}
              </span>
            );
          })}
        </span>
      )}
    </>
  );

  return (
    <div className="relative" style={style}>
      {cubby && !isFocused ? (
        <button
          type="button"
          onClick={onFocus}
          aria-label={`${shelfName(cubby.console)} shelf, ${cubby.games.length} games. Walk up to it`}
          className={cn(
            "absolute inset-0 overflow-hidden transition-[filter] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            isZoomed ? "brightness-75 hover:brightness-90" : "cursor-zoom-in hover:brightness-125",
          )}
        >
          {inside}
        </button>
      ) : (
        <div className="absolute inset-0">{inside}</div>
      )}

      {label && cubby && (
        <span
          className="pointer-events-none absolute left-[6%] z-20 rounded-[0.08cqw] border border-white/40 bg-white/15 p-[0.07cqw] shadow-[0_0.08cqw_0.15cqw_rgb(0_0_0/0.45)]"
          style={{ top: "100%", marginTop: `${(cube * BOARD * 0.12).toFixed(3)}cqw` }}
        >
          <span
            className="flex items-baseline gap-[0.3em] whitespace-nowrap rounded-[0.05cqw] bg-[oklch(0.98_0.01_95)] px-[0.45em] py-[0.2em] font-sans leading-none text-[oklch(0.22_0.02_60)]"
            style={{ fontSize: `${(cube * 0.034).toFixed(3)}cqw` }}
          >
            <span className="font-extrabold uppercase tracking-[0.08em]">{shelfName(cubby.console)}</span>
            <span className="text-[0.85em] font-medium text-[oklch(0.45_0.02_60)]">{label}</span>
          </span>
        </span>
      )}
    </div>
  );
}

/** A spine seen from across the room; the cubby around it is the button. */
function StaticSpine({ game }: { game: Game }) {
  const look = caseStyle(game.platform);

  return (
    <span
      className="relative block shadow-[1px_0_1px_rgb(0_0_0/0.6)]"
      style={{ width: `calc(var(--mm) * ${look.depth})`, height: `calc(var(--mm) * ${look.h})` }}
    >
      <SpineFace game={game} />
    </span>
  );
}

/** A side wall, ceiling or shelf surface inside a cube, lit by how much it faces the room. */
function Face({ points, shade }: { points: string; shade: number }) {
  const polygon = points
    .split(",")
    .map((pair) => pair.trim().split(/\s+/).map((v) => `${v}%`).join(" "))
    .join(", ");

  return (
    <span
      className="absolute inset-0"
      style={{
        clipPath: `polygon(${polygon})`,
        background: `linear-gradient(rgb(0 0 0 / ${shade}), rgb(0 0 0 / ${shade})), ${WOOD_GRAIN}, var(--wood)`,
      }}
    />
  );
}
