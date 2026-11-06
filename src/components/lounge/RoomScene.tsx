import room70 from "@/assets/room-70s.webp";
import room80 from "@/assets/room-80s.webp";
import room90 from "@/assets/room-90s.webp";
import tvGrey from "@/assets/tv-grey.webp";
import tvWood from "@/assets/tv-wood.webp";
import { useState } from "react";
import { caseStyle, wobble } from "@/lib/caseStyle";
import { consoleArt, type ConsoleArt } from "@/lib/consoleArt";
import type { ConsoleSummary, Game } from "@/lib/games";
import { layoutZone, type LayoutColumn, type LayoutItem } from "@/lib/roomLayout";
import type { RoomTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { BacklogShelf, BookcaseFrame } from "./Bookcase";
import { CaseFlat } from "./GameCase";
import { TvScreen, type TvPicture } from "./TvScreen";

type Rect = { l: number; t: number; r: number; b: number };

type Scene = {
  room: string;
  tv: string;
  /** % of scene width. */
  tvWidth: number;
  /** h / w of the TV image. */
  tvAspect: number;
  /** Real width of that TV, which sets the scale for everything on the cabinet. */
  tvCm: number;
  /** Where the glass sits inside the TV image, as fractions. */
  screen: Rect;
  /** % of scene. */
  cabinet: { l: number; r: number; top: number };
  bookcase: { l: number; w: number; t: number; b: number };
  /** Grades studio photos into the room's light. */
  grade: string;
  tint: string;
};

const SCENES: Record<RoomTheme, Scene> = {
  seventies: {
    room: room70,
    tv: tvWood,
    tvWidth: 25,
    tvAspect: 971 / 893,
    tvCm: 56,
    screen: { l: 0.085, t: 0.32, r: 0.745, b: 0.795 },
    cabinet: { l: 20, r: 81, top: 58.6 },
    bookcase: { l: 1.5, w: 15, t: 16, b: 8 },
    grade: "sepia(0.4) saturate(0.8) brightness(0.74) contrast(1.02)",
    tint: "oklch(0.7 0.14 60 / 0.28)",
  },
  eighties: {
    room: room80,
    tv: tvGrey,
    tvWidth: 25,
    tvAspect: 832 / 923,
    tvCm: 48,
    screen: { l: 0.115, t: 0.13, r: 0.885, b: 0.77 },
    cabinet: { l: 20, r: 80.5, top: 57 },
    bookcase: { l: 1.5, w: 14, t: 18, b: 9 },
    grade: "brightness(0.58) saturate(0.85) hue-rotate(-12deg) contrast(1.08)",
    tint: "oklch(0.6 0.25 330 / 0.32)",
  },
  nineties: {
    room: room90,
    tv: tvGrey,
    tvWidth: 22.5,
    tvAspect: 832 / 923,
    tvCm: 46,
    screen: { l: 0.115, t: 0.13, r: 0.885, b: 0.77 },
    cabinet: { l: 23.8, r: 75.2, top: 59.5 },
    bookcase: { l: 1.5, w: 14, t: 17, b: 8 },
    grade: "sepia(0.12) brightness(0.84) saturate(0.88) contrast(1.03)",
    tint: "oklch(0.75 0.06 240 / 0.16)",
  },
};

const SCENE_ASPECT = 1088 / 1920;
const GAP = 0.7;
const STACK_LIMIT = 5;

type Placed = LayoutItem & { console: ConsoleSummary; art: ConsoleArt };

/** The picture on the TV: the channel's game in progress, or the latest game with art. */
function pickPicture(games: Game[]): TvPicture | null {
  const withArt = games.filter((g) => g.hero_url || g.cover_url);
  const game = withArt.find((g) => g.status === "playing") ?? withArt[0];
  if (!game) return null;

  return { src: (game.hero_url ?? game.cover_url)!, title: game.title, progress: game.progress, isPlaying: game.status === "playing" };
}

type Props = {
  theme: RoomTheme;
  consoles: ConsoleSummary[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  onAdd: () => void;
  onPickGame?: ((g: Game) => void) | undefined;
};

export function RoomScene({ theme, consoles, selected, onSelect, onAdd, onPickGame }: Props) {
  const s = SCENES[theme];
  const active = consoles.find((c) => c.name === selected) ?? null;
  const all = consoles.flatMap((c) => c.games);
  const shown = active ? active.games : all;
  const playing = shown.filter((g) => g.status === "playing").slice(0, 3);
  const backlog = all.filter((g) => g.status === "backlog");
  const picture = pickPicture(shown);

  const cmToPct = s.tvWidth / s.tvCm;
  const tvLeft = 50 - s.tvWidth / 2;
  const tvHeight = (s.tvWidth * s.tvAspect) / SCENE_ASPECT;
  const tvTop = s.cabinet.top + 1 - tvHeight;
  const screen = {
    left: tvLeft + s.screen.l * s.tvWidth,
    top: tvTop + s.screen.t * tvHeight,
    width: (s.screen.r - s.screen.l) * s.tvWidth,
    height: (s.screen.b - s.screen.t) * tvHeight,
  };

  const zoneWidth = tvLeft - s.cabinet.l - 2.4;
  const sides = {
    l: consoles.filter((_, i) => i % 2 === 0),
    r: consoles.filter((_, i) => i % 2 === 1),
  };

  const cycle = (dir: number) => {
    if (!consoles.length) return;

    const names: (string | null)[] = [null, ...consoles.map((c) => c.name)];
    const i = names.indexOf(selected);
    onSelect(names[(i + dir + names.length) % names.length] ?? null);
  };

  const renderZone = (list: ConsoleSummary[], side: "l" | "r") => {
    const items: Placed[] = list.map((c) => {
      const art = consoleArt(c.name);

      return { key: c.name, width: art.cm * cmToPct, isStackable: art.isStackable, console: c, art };
    });
    const stackGames = list
      .flatMap((c) => c.games)
      .filter((g) => g.status !== "backlog")
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, STACK_LIMIT);
    const stackWidth = stackGames.length ? (Math.max(...stackGames.map((g) => caseStyle(g.platform).h)) / 10) * cmToPct : 0;

    const ordered = side === "l" ? [...items].reverse() : items;
    const layout = layoutZone(ordered, zoneWidth, GAP);
    const host = [...layout.columns]
      .filter((c) => c.items.length < 3 && c.items[c.items.length - 1]!.isStackable && c.width >= stackWidth)
      .sort((a, b) => b.width - a.width)[0];
    const needsOwnColumn = stackGames.length > 0 && !host;
    const final = needsOwnColumn ? layoutZone([...ordered, stackItem(stackWidth)], zoneWidth, GAP) : layout;
    const columns = side === "l" && needsOwnColumn ? [final.columns.at(-1)!, ...final.columns.slice(0, -1)] : final.columns;

    return (
      <div
        className={cn("absolute flex items-end", side === "l" ? "justify-end" : "justify-start")}
        style={{
          left: side === "l" ? `${s.cabinet.l + 1}%` : `${50 + s.tvWidth / 2 + 1.4}%`,
          width: `${zoneWidth}%`,
          bottom: `${100 - s.cabinet.top - 1.1}%`,
          gap: `${(GAP * final.scale * 100) / zoneWidth}%`,
        }}
      >
        {columns.map((column) => {
          const width = `${((column.width * final.scale) / zoneWidth) * 100}%`;
          if (column.items[0]!.key === STACK_KEY) {
            return <GameStack key={STACK_KEY} games={stackGames} width={width} grade={s.grade} onPick={onPickGame} />;
          }

          return (
            <ConsoleColumn
              key={column.items[0]!.key}
              column={column as LayoutColumn<Placed>}
              width={width}
              scene={s}
              selected={selected}
              onSelect={onSelect}
              stack={column === host ? stackGames : []}
              stackWidth={stackWidth}
              onPickGame={onPickGame}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-4 border-wood-dark shadow-chunky select-none">
      <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: "1920 / 1088" }}>
        <img src={s.room} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />

        <TvLight picture={picture} screen={screen} tvTop={tvTop} tvHeight={tvHeight} cabinetTop={s.cabinet.top} />

        <div className="absolute" style={{ left: `${tvLeft}%`, width: `${s.tvWidth}%`, top: `${tvTop}%` }}>
          <img src={s.tv} alt="" className="relative w-full" style={{ filter: "drop-shadow(0 14px 14px rgb(0 0 0 / 0.6))" }} />
          <div
            className="absolute"
            style={{
              left: `${s.screen.l * 100}%`,
              top: `${s.screen.t * 100}%`,
              width: `${(s.screen.r - s.screen.l) * 100}%`,
              height: `${(s.screen.b - s.screen.t) * 100}%`,
            }}
          >
            <TvScreen
              channel={active ? active.name : consoles.length ? "ALL" : null}
              total={shown.length}
              done={shown.filter((g) => g.status === "done").length}
              spent={shown.reduce((sum, g) => sum + Number(g.price ?? 0), 0)}
              playing={playing}
              picture={picture}
              onAdd={onAdd}
              onPrev={() => cycle(-1)}
              onNext={() => cycle(1)}
            />
          </div>
        </div>

        <BookcaseFrame
          className="absolute"
          frame={`${s.bookcase.w * 0.06}cqw`}
          style={{
            left: `${s.bookcase.l}%`,
            width: `${s.bookcase.w}%`,
            top: `${s.bookcase.t}%`,
            bottom: `${s.bookcase.b}%`,
            filter: s.grade.replace(/brightness\(([\d.]+)\)/, (_, b) => `brightness(${Math.min(1, Number(b) + 0.12)})`),
          }}
        >
          <BacklogShelf
            games={backlog}
            onPick={onPickGame}
            header={
              <p className="px-1 pt-[4%] text-center font-screen text-[1.15cqw] leading-none text-primary screen-glow-text">
                BACKLOG · {backlog.length}
              </p>
            }
          />
        </BookcaseFrame>

        {renderZone(sides.l, "l")}
        {renderZone(sides.r, "r")}

        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 75% 70% at 50% 48%, transparent 55%, rgb(0 0 0 / 0.42) 100%)" }}
        />

        {consoles.length === 0 && (
          <button
            onClick={onAdd}
            className="absolute -translate-x-1/2 animate-pulse rounded-full bg-foreground/75 px-3 py-1 font-screen text-[1.6cqw] text-background"
            style={{ left: `${(s.cabinet.l + tvLeft) / 2}%`, top: `${s.cabinet.top - 6}%` }}
          >
            + plug in a console
          </button>
        )}
      </div>
    </div>
  );
}

const STACK_KEY = "__game-stack";

const stackItem = (width: number) => ({ key: STACK_KEY, width, isStackable: false }) as Placed;

function ConsoleColumn({
  column,
  width,
  scene,
  selected,
  onSelect,
  stack,
  stackWidth,
  onPickGame,
}: {
  column: LayoutColumn<Placed>;
  width: string;
  scene: Scene;
  selected: string | null;
  onSelect: (name: string | null) => void;
  stack: Game[];
  stackWidth: number;
  onPickGame?: ((g: Game) => void) | undefined;
}) {
  const levels = column.items;
  const top = levels[levels.length - 1]!;
  const [hovered, setHovered] = useState<string | null>(null);
  const labelled = levels.find((item) => item.key === hovered) ?? levels.find((item) => item.key === selected);

  return (
    <div className="relative flex shrink-0 flex-col-reverse items-center" style={{ width }}>
      {labelled && (
        <span
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-30 mb-[0.6cqw] -translate-x-1/2 whitespace-nowrap rounded-full px-[0.6em] py-[0.2em] font-screen text-[1.3cqw] leading-none shadow-[0_2px_6px_rgb(0_0_0/0.5)]",
            labelled.key === selected ? "bg-primary text-primary-foreground" : "bg-foreground/85 text-background",
          )}
        >
          {labelled.console.name} · {labelled.console.games.length}
        </span>
      )}
      {levels.map((item, level) => {
        const below = levels[level - 1];
        const share = item.width / column.width;
        // Rest on the middle of the visible top surface of the console below.
        const sink = below ? below.art.top * 0.62 * below.art.aspect * (below.width / column.width) * 100 : 0;

        return (
          <ConsoleButton
            key={item.key}
            item={item}
            scene={scene}
            isSelected={item.key === selected}
            onSelect={onSelect}
            onHover={(isOver) => setHovered(isOver ? item.key : null)}
            style={{
              width: `${share * 100}%`,
              marginBottom: below ? `-${sink}%` : undefined,
              translate: below ? `${wobble(item.key, 3)}% 0` : undefined,
              zIndex: level + 1,
            }}
            isStacked={Boolean(below)}
          />
        );
      })}
      {stack.length > 0 && (
        <div
          className="relative"
          style={{
            width: `${(stackWidth / column.width) * 100}%`,
            marginBottom: `-${top.art.top * 0.6 * top.art.aspect * (top.width / column.width) * 100}%`,
            zIndex: levels.length + 1,
          }}
        >
          <CaseStackBody games={stack} grade={scene.grade} onPick={onPickGame} />
        </div>
      )}
    </div>
  );
}

function ConsoleButton({
  item,
  scene,
  isSelected,
  isStacked,
  onSelect,
  onHover,
  style,
}: {
  item: Placed;
  scene: Scene;
  isSelected: boolean;
  isStacked: boolean;
  onSelect: (name: string | null) => void;
  onHover: (isOver: boolean) => void;
  style: React.CSSProperties;
}) {
  const { console: c, art } = item;

  return (
    <button
      type="button"
      onClick={() => onSelect(isSelected ? null : c.name)}
      aria-pressed={isSelected}
      aria-label={`${c.name}, ${c.games.length} games`}
      className="group relative block shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      style={style}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-[4%] right-[4%] rounded-[50%] bg-black blur-[3px]",
          isStacked ? "bottom-[2%] h-[16%] opacity-50" : "-bottom-[5%] h-[14%] opacity-75",
        )}
      />
      <span className="relative block transition-[filter] duration-300 group-hover:brightness-110">
        <img
          src={art.src}
          alt=""
          draggable={false}
          className="block w-full"
          style={{
            filter: `${scene.grade} drop-shadow(0 3px 3px rgb(0 0 0 / 0.55))${isSelected ? " drop-shadow(0 0 6px var(--screen-glow))" : ""}`,
          }}
        />
        <span
          className="pointer-events-none absolute inset-0 mix-blend-color"
          style={{
            background: scene.tint,
            maskImage: `url(${art.src})`,
            maskSize: "100% 100%",
            WebkitMaskImage: `url(${art.src})`,
            WebkitMaskSize: "100% 100%",
          }}
        />
      </span>
    </button>
  );
}

function CaseStackBody({ games, grade, onPick }: { games: Game[]; grade: string; onPick?: ((g: Game) => void) | undefined }) {
  const widest = Math.max(...games.map((g) => caseStyle(g.platform).h));

  return (
    <div className="relative flex flex-col items-center" style={{ filter: `${grade} drop-shadow(0 2px 2px rgb(0 0 0 / 0.6))` }}>
      {games.map((game) => (
        <CaseFlat
          key={game.id}
          game={game}
          onPick={onPick}
          style={{
            width: `${(caseStyle(game.platform).h / widest) * 100}%`,
            translate: `${wobble(game.id, 4)}% 0`,
            rotate: `${wobble(game.id + "r", 0.8)}deg`,
          }}
        />
      ))}
    </div>
  );
}

function GameStack({ games, width, grade, onPick }: { games: Game[]; width: string; grade: string; onPick?: ((g: Game) => void) | undefined }) {
  return (
    <div className="relative shrink-0" style={{ width }}>
      <span className="pointer-events-none absolute -bottom-[6%] left-[4%] right-[4%] h-[30%] rounded-[50%] bg-black/70 blur-[3px]" />
      <CaseStackBody games={games} grade={grade} onPick={onPick} />
    </div>
  );
}

/** Light from the screen: the picture, blurred, washing the wall and the top of the cabinet. */
function TvLight({
  picture,
  screen,
  tvTop,
  tvHeight,
  cabinetTop,
}: {
  picture: TvPicture | null;
  screen: { left: number; top: number; width: number; height: number };
  tvTop: number;
  tvHeight: number;
  cabinetTop: number;
}) {
  const centre = screen.left + screen.width / 2;

  return (
    <>
      <div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          left: `${centre - screen.width * 0.9}%`,
          width: `${screen.width * 1.8}%`,
          top: `${tvTop + tvHeight * 0.1}%`,
          height: `${tvHeight * 0.7}%`,
          background: "var(--screen-glow)",
          opacity: picture ? 0.5 : 0.9,
        }}
      />
      {picture && (
        <img
          key={picture.src}
          src={picture.src}
          alt=""
          className="pointer-events-none absolute object-cover opacity-45 mix-blend-screen blur-[3cqw] animate-in fade-in duration-700"
          style={{
            left: `${centre - screen.width * 1.25}%`,
            width: `${screen.width * 2.5}%`,
            top: `${screen.top - screen.height * 0.35}%`,
            height: `${cabinetTop + 7 - (screen.top - screen.height * 0.35)}%`,
            maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 20%, transparent 75%)",
          }}
        />
      )}
    </>
  );
}
