import type { CSSProperties, ReactNode } from "react";
import { caseStyle, wobble } from "@/lib/caseStyle";
import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";
import { CaseFront, CaseSpine } from "./GameCase";

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
