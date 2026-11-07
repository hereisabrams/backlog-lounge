import { Star } from "lucide-react";
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

/** The outside of a game box: the plastic shell, the platform banner, the art, and the gloss of the wrap. */
export function CoverFace({ game, className }: { game: Game; className?: string }) {
  const look = caseStyle(game.platform);

  return (
    <span
      className={cn("relative block rounded-[3%/2.4%] [container-type:inline-size]", className)}
      style={{
        aspectRatio: `${look.w} / ${look.h}`,
        background: `linear-gradient(90deg, color-mix(in oklab, ${look.shell} 70%, black) 0 6%, ${look.shell} 9%, ${look.shell})`,
        boxShadow: "3px 4px 6px rgb(0 0 0 / 0.55), inset 0 0 0 1px rgb(255 255 255 / 0.12)",
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
    </span>
  );
}

/** A game box facing out, clickable. */
export function CaseFront({ game, onPick, className, style }: CaseProps) {
  return (
    <button
      type="button"
      onClick={() => onPick?.(game)}
      aria-label={`${game.title} (${game.platform})`}
      title={game.title}
      className={cn(
        "relative block shrink-0 origin-bottom rounded-[3%/2.4%] transition-[translate,filter] duration-300 ease-out hover:-translate-y-[3%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      style={style}
    >
      <CoverFace game={game} className="w-full" />
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

/** The platform mark at the top of a spine: PS5's white band, PS4 blue, Switch red with Joy-Cons, Xbox green. */
function SpineBand({ platform }: { platform: string }) {
  const look = caseStyle(platform);
  const key = platform.trim().toLowerCase();
  if (!look.band) return null;

  const isSwitch = key === "switch" || key === "switch 2";

  return (
    <span
      className="relative z-10 flex h-[11%] shrink-0 flex-col items-center justify-center gap-[3cqw] font-sans font-extrabold leading-none"
      style={{ background: look.band, color: look.ink, boxShadow: "0 1px 0 rgb(0 0 0 / 0.35)" }}
    >
      {isSwitch ? (
        <>
          <span className="flex gap-[6cqw]" aria-hidden="true">
            <span className="h-[34cqw] w-[20cqw] rounded-l-full border-[5cqw] border-current" />
            <span className="h-[34cqw] w-[20cqw] rounded-r-full bg-current" />
          </span>
          {key === "switch 2" && <span className="text-[34cqw]">2</span>}
        </>
      ) : (
        <span className="text-[30cqw] tracking-tight">{look.label.replace(/^PlayStation /, "PS").replace(/^Xbox .*/, "XBOX").slice(0, 5)}</span>
      )}
    </span>
  );
}

/** The spine of a game box: platform band, the game's art behind its title, and a status sticker. */
export function SpineFace({ game, className }: { game: Game; className?: string }) {
  const look = caseStyle(game.platform);

  return (
    <span
      className={cn("absolute inset-0 flex flex-col overflow-hidden rounded-[1.5px] [container-type:inline-size]", className)}
      style={{
        background: look.shell,
        boxShadow: `inset 1px 0 0 color-mix(in oklab, ${look.shell} 60%, white), inset -1px 0 0 color-mix(in oklab, ${look.shell} 60%, black)`,
      }}
    >
      <SpineBand platform={game.platform} />
      <span className="relative min-h-0 flex-1 overflow-hidden">
        {game.cover_url && (
          <img
            src={game.cover_url}
            alt=""
            loading="lazy"
            draggable={false}
            className="absolute inset-0 h-full w-full scale-150 object-cover brightness-[0.5] saturate-[1.15]"
          />
        )}
        <span className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.45),transparent_30%,transparent_70%,rgb(0_0_0/0.5)),linear-gradient(180deg,rgb(0_0_0/0.15),rgb(0_0_0/0.35))]" />
        <span className="relative flex h-full items-start justify-center overflow-hidden pt-[30cqw] font-sans text-[54cqw] font-bold uppercase leading-none tracking-wide text-white [writing-mode:vertical-rl] [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
          <span className="truncate">{game.title}</span>
        </span>
      </span>
      <span className="flex h-[7%] shrink-0 items-center justify-center bg-black/80">
        <span className="size-[46cqw] rounded-full" style={{ background: `var(--status-${game.status})` }} />
      </span>
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
        "relative block shrink-0 transition-[translate,filter] duration-300 ease-out hover:-translate-y-[4%] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        className,
      )}
      style={{ aspectRatio: `${look.depth} / ${look.h}`, boxShadow: "1px 0 1px rgb(0 0 0 / 0.6)", ...style }}
    >
      <SpineFace game={game} />
    </button>
  );
}

const STATUS_LABEL = { backlog: "Backlog", playing: "Playing", stopped: "Stopped", done: "Done" } as const;

/**
 * A box filed spine-out on the Collection Wall. On hover or keyboard focus it slides up off the shelf and swings
 * round to show its cover, with a shop sticker for status and score. Sizes come from --mm (pixels per millimetre).
 */
export function ShelfCase({ game, onPick }: { game: Game; onPick?: ((game: Game) => void) | undefined }) {
  const look = caseStyle(game.platform);

  return (
    <button
      type="button"
      onClick={() => onPick?.(game)}
      aria-label={`${game.title} (${game.platform}), ${STATUS_LABEL[game.status]}`}
      className="group/shelf relative shrink-0 [perspective:900px] focus-visible:outline-none hover:z-30 focus-visible:z-30"
      style={{ width: `calc(var(--mm) * ${look.depth})`, height: `calc(var(--mm) * ${look.h})` }}
    >
      <SpineFace
        game={game}
        className="shadow-[1px_0_1px_rgb(0_0_0/0.6)] transition-[translate,opacity] duration-200 ease-out group-hover/shelf:-translate-y-[6%] group-hover/shelf:opacity-0 group-hover/shelf:delay-75 group-focus-visible/shelf:-translate-y-[6%] group-focus-visible/shelf:opacity-0 motion-reduce:transition-none"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 block origin-bottom opacity-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.2,0.9,0.25,1.15)] [transform:translateX(-50%)_rotateY(-88deg)_scale(0.94)] group-hover/shelf:opacity-100 group-hover/shelf:delay-100 group-hover/shelf:[transform:translateX(-50%)_translateY(-9%)_translateZ(70px)_rotateY(0deg)_scale(1.18)] group-focus-visible/shelf:opacity-100 group-focus-visible/shelf:[transform:translateX(-50%)_translateY(-9%)_translateZ(70px)_rotateY(0deg)_scale(1.18)] motion-reduce:transition-opacity motion-reduce:[transform:translateX(-50%)_translateY(-9%)]"
        style={{ width: `calc(var(--mm) * ${look.w})` }}
      >
        <CoverFace game={game} className="w-full shadow-[0_18px_30px_rgb(0_0_0/0.55)] group-focus-visible/shelf:outline-2 group-focus-visible/shelf:outline-offset-4 group-focus-visible/shelf:outline-ring" />
        <span className="absolute -right-[10%] top-[16%] rotate-[8deg] rounded-[3px] bg-[oklch(0.97_0.03_95)] px-[0.45em] py-[0.25em] text-left font-sans text-[11px] font-bold leading-tight text-[oklch(0.25_0.03_60)] shadow-[1px_2px_3px_rgb(0_0_0/0.4)]">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: `var(--status-${game.status})` }} />
            {STATUS_LABEL[game.status]}
          </span>
          {game.score != null && (
            <span className="flex items-center gap-1 tabular-nums">
              <Star className="size-2.5 fill-current" /> {game.score}/10
            </span>
          )}
        </span>
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
