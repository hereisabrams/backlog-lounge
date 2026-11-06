import type { CSSProperties } from "react";
import { caseStyle } from "@/lib/caseStyle";
import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";

type CaseProps = {
  game: Game;
  onPick?: ((game: Game) => void) | undefined;
  className?: string;
  style?: CSSProperties;
};

/** A game box facing out: the plastic shell, the platform banner, the art, and the gloss of the wrap. */
export function CaseFront({ game, onPick, className, style }: CaseProps) {
  const look = caseStyle(game.platform);

  return (
    <button
      type="button"
      onClick={() => onPick?.(game)}
      aria-label={`${game.title} (${game.platform})`}
      title={game.title}
      className={cn(
        "group/case relative block shrink-0 origin-bottom rounded-[3%/2.4%] [container-type:inline-size] transition-[translate,filter] duration-300 ease-out hover:-translate-y-[3%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      style={{
        aspectRatio: `${look.w} / ${look.h}`,
        background: `linear-gradient(90deg, color-mix(in oklab, ${look.shell} 70%, black) 0 6%, ${look.shell} 9%, ${look.shell})`,
        boxShadow: "3px 4px 6px rgb(0 0 0 / 0.55), inset 0 0 0 1px rgb(255 255 255 / 0.12)",
        ...style,
      }}
    >
      <span className="absolute inset-x-[4%] inset-y-[3%] flex flex-col overflow-hidden rounded-[2%] bg-black">
        {look.band && (
          <span
            className="relative z-10 flex h-[11%] shrink-0 items-center px-[6%] font-sans text-[9cqw] font-bold uppercase leading-none tracking-wide"
            style={{ background: look.band, color: look.ink }}
          >
            {look.label}
          </span>
        )}
        <CoverArt game={game} accent={look.shell} />
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,rgb(255_255_255/0.22)_0%,rgb(255_255_255/0.06)_28%,transparent_42%,transparent_70%,rgb(255_255_255/0.08)_100%)] mix-blend-screen" />
    </button>
  );
}

function CoverArt({ game, accent }: { game: Game; accent: string }) {
  if (game.cover_url) {
    return (
      <img
        src={game.cover_url}
        alt=""
        loading="lazy"
        draggable={false}
        className="min-h-0 w-full flex-1 object-cover"
      />
    );
  }

  return (
    <span
      className="flex min-h-0 flex-1 items-end p-[8%] text-left font-display text-[13cqw] leading-[1.05] text-white [text-wrap:balance]"
      style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${accent} 55%, white), ${accent} 55%, color-mix(in oklab, ${accent} 60%, black))` }}
    >
      {game.title}
    </span>
  );
}

/** A game box standing on a shelf, spine out, title running top to bottom. */
export function CaseSpine({ game, onPick, className, style }: CaseProps) {
  const look = caseStyle(game.platform);

  return (
    <button
      type="button"
      onClick={() => onPick?.(game)}
      aria-label={`${game.title} (${game.platform})`}
      title={game.title}
      className={cn(
        "relative flex shrink-0 flex-col items-center overflow-hidden rounded-[1px] [container-type:inline-size] transition-[translate,filter] duration-300 ease-out hover:-translate-y-[4%] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        className,
      )}
      style={{
        aspectRatio: `${look.depth} / ${look.h}`,
        background: `linear-gradient(90deg, color-mix(in oklab, ${look.shell} 65%, black), ${look.shell} 35%, color-mix(in oklab, ${look.shell} 80%, white) 55%, ${look.shell} 70%, color-mix(in oklab, ${look.shell} 60%, black))`,
        boxShadow: "1px 0 1px rgb(0 0 0 / 0.6)",
        color: look.ink,
        ...style,
      }}
    >
      {look.band && (
        <span className="h-[11%] w-full shrink-0" style={{ background: look.band, boxShadow: "0 1px 0 rgb(0 0 0 / 0.35)" }} />
      )}
      <span className="min-h-0 flex-1 overflow-hidden py-[40%] text-[62cqw] font-semibold leading-none [writing-mode:vertical-rl] whitespace-nowrap">
        {game.title}
      </span>
    </button>
  );
}

/** A game box lying flat in a stack, spine facing the room. */
export function CaseFlat({ game, onPick, className, style }: CaseProps) {
  const look = caseStyle(game.platform);

  return (
    <button
      type="button"
      onClick={() => onPick?.(game)}
      aria-label={`${game.title} (${game.platform})`}
      title={game.title}
      className={cn(
        "relative flex w-full items-center overflow-hidden rounded-[1px] [container-type:size] transition-[translate,filter] duration-300 ease-out hover:-translate-x-[3%] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
      style={{
        aspectRatio: `${look.h} / ${look.depth}`,
        background: `linear-gradient(180deg, color-mix(in oklab, ${look.shell} 75%, white), ${look.shell} 40%, color-mix(in oklab, ${look.shell} 55%, black))`,
        boxShadow: "0 1px 1px rgb(0 0 0 / 0.55)",
        color: look.ink,
        ...style,
      }}
    >
      {look.band && <span className="h-full w-[11%] shrink-0" style={{ background: look.band }} />}
      <span className="truncate px-[4%] text-[62cqh] font-semibold leading-none">{game.title}</span>
    </button>
  );
}
