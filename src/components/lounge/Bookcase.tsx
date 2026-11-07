import type { CSSProperties, ReactNode } from "react";
import { caseStyle, shelfName, wobble } from "@/lib/caseStyle";
import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";
import { CaseFront, CaseSpine, ShelfCase } from "./GameCase";

const WOOD_GRAIN =
  "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.07) 0 1px, transparent 1px 6px), repeating-linear-gradient(88deg, rgb(255 255 255 / 0.035) 0 2px, transparent 2px 13px)";

/** A wooden bookcase: side panels, top cap, plinth and a shadowed back panel. */
export function BookcaseFrame({
  children,
  className,
  style,
  frame = "0.75rem",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Thickness of the side panels; the room passes a share of the bookcase width. */
  frame?: string;
}) {
  return (
    <div
      className={cn("relative flex flex-col rounded-[3px]", className)}
      style={{
        padding: `calc(${frame} * 0.8) ${frame} calc(${frame} * 1.6)`,
        background: `${WOOD_GRAIN}, linear-gradient(90deg, var(--wood-dark), var(--wood) 18%, color-mix(in oklab, var(--wood) 88%, white) 50%, var(--wood) 82%, var(--wood-dark))`,
        boxShadow: "10px 14px 22px rgb(0 0 0 / 0.55), inset 0 2px 0 rgb(255 255 255 / 0.12), inset 0 -3px 0 rgb(0 0 0 / 0.35)",
        ...style,
      }}
    >
      <div
        className="flex flex-1 flex-col"
        style={{
          background: `${WOOD_GRAIN}, linear-gradient(180deg, color-mix(in oklab, var(--wood-dark) 70%, black), color-mix(in oklab, var(--wood-dark) 85%, black))`,
          boxShadow: "inset 7px 0 9px -5px rgb(0 0 0 / 0.7), inset -7px 0 9px -5px rgb(0 0 0 / 0.7)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Plank() {
  return (
    <div
      className="relative z-10 shrink-0"
      style={{
        aspectRatio: "28 / 1",
        background: `${WOOD_GRAIN}, linear-gradient(180deg, color-mix(in oklab, var(--wood) 80%, white), var(--wood) 35%, var(--wood-dark))`,
        boxShadow: "0 5px 7px rgb(0 0 0 / 0.55)",
      }}
    />
  );
}

/** Interior width of the room's backlog bookcase in millimetres; boxes are sized against it. */
const BACKLOG_SHELF_MM = 360;

/** The room's backlog shelf: each shelf has one game facing out at an end, the rest standing spine-out. */
export function BacklogShelf({
  games,
  rows = 4,
  onPick,
  header,
}: {
  games: Game[];
  rows?: number;
  onPick?: ((game: Game) => void) | undefined;
  header?: ReactNode;
}) {
  const shelves = Array.from({ length: rows }, (_, row) => games.filter((_, i) => i % rows === row));

  return (
    <>
      {header}
      {shelves.map((shelf, row) => {
        const [front, ...spines] = shelf;
        const isFrontRight = row % 2 === 1;

        return (
          <div key={row} className="flex min-h-0 flex-1 flex-col justify-end" style={{ boxShadow: "inset 0 12px 12px -8px rgb(0 0 0 / 0.75)" }}>
            <div className={cn("flex items-end gap-[0.4%] px-[2.5%]", isFrontRight && "flex-row-reverse")}>
              {front && (
                <CaseFront
                  game={front}
                  onPick={onPick}
                  className="mr-[2%]"
                  style={{
                    width: `${(caseStyle(front.platform).w / BACKLOG_SHELF_MM) * 100}%`,
                    rotate: `${(isFrontRight ? 2.5 : -2.5) + wobble(front.id, 0.8)}deg`,
                  }}
                />
              )}
              {spines.map((game) => (
                <CaseSpine
                  key={game.id}
                  game={game}
                  onPick={onPick}
                  style={{ width: `${(caseStyle(game.platform).depth / BACKLOG_SHELF_MM) * 100}%` }}
                />
              ))}
            </div>
            <Plank />
          </div>
        );
      })}
    </>
  );
}

const PLANK_PX = 14;

/** "The Last of Us" files under L, the way a shop shelves it. */
const filingTitle = (title: string) => title.replace(/^the\s+/i, "").toLowerCase();

/**
 * One console's run of shelves on the Collection Wall: a printed label clipped to the shelf edge, then its games
 * filed A–Z, spine out. Box sizes are real millimetres scaled by --mm, set on the wall.
 */
export function ConsoleSection({ name, games, onPick }: { name: string; games: Game[]; onPick?: ((g: Game) => void) | undefined }) {
  const filed = [...games].sort((a, b) => filingTitle(a.title).localeCompare(filingTitle(b.title)));
  const tallest = Math.max(...games.map((g) => caseStyle(g.platform).h));
  const first = filed[0]?.title.replace(/^the\s+/i, "").charAt(0).toUpperCase();
  const last = filed.at(-1)?.title.replace(/^the\s+/i, "").charAt(0).toUpperCase();

  return (
    <section
      aria-label={`${shelfName(name)}, ${games.length} games`}
      className="relative"
      style={{ ["--row" as string]: `calc(var(--mm) * ${tallest} + ${PLANK_PX + 30}px)` }}
    >
      <div
        className="flex flex-wrap items-end gap-x-[2px] px-[3%]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgb(0 0 0 / 0.6), transparent 26px), linear-gradient(180deg, transparent calc(var(--row) - ${PLANK_PX}px), color-mix(in oklab, var(--wood) 78%, white) calc(var(--row) - ${PLANK_PX}px), var(--wood) calc(var(--row) - ${PLANK_PX - 4}px), var(--wood-dark) var(--row))`,
          backgroundSize: "100% var(--row), 100% var(--row)",
        }}
      >
        {filed.map((game) => (
          <div key={game.id} className="flex h-[var(--row)] items-end" style={{ paddingBottom: PLANK_PX }}>
            <ShelfCase game={game} onPick={onPick} />
          </div>
        ))}
      </div>
      <ShelfLabel
        name={shelfName(name)}
        detail={`${games.length} ${games.length === 1 ? "game" : "games"}${first && last && first !== last ? ` · ${first}–${last}` : ""}`}
      />
    </section>
  );
}

/** A printed card in a clear plastic holder, clipped to the front of the first shelf. */
function ShelfLabel({ name, detail }: { name: string; detail: string }) {
  return (
    <div
      className="pointer-events-none absolute left-[3%] z-20 rounded-[3px] border border-white/40 bg-white/15 p-[3px] shadow-[0_2px_4px_rgb(0_0_0/0.45)] backdrop-blur-[1px]"
      style={{ top: `calc(var(--row) - ${PLANK_PX + 2}px)` }}
    >
      <div className="flex items-baseline gap-2 rounded-[2px] bg-[oklch(0.98_0.01_95)] px-2 py-[3px] font-sans leading-none text-[oklch(0.22_0.02_60)]">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em]">{name}</span>
        <span className="text-[10px] font-medium text-[oklch(0.45_0.02_60)]">{detail}</span>
      </div>
    </div>
  );
}
