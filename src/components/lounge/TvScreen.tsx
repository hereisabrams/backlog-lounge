import { useEffect, useState } from "react";
import type { Game } from "@/lib/games";
import { useMoney } from "@/lib/settings";
import { cn } from "@/lib/utils";

export type TvPicture = { src: string; title: string; progress: number; isPlaying: boolean };

const STATIC_MS = 420;

const bar = (progress: number) => {
  const filled = Math.round(progress / 20);

  return "█".repeat(filled) + "░".repeat(5 - filled);
};

type Props = {
  /** null = nothing plugged in. */
  channel: string | null;
  total: number;
  done: number;
  spent: number;
  playing: Game[];
  picture: TvPicture | null;
  onAdd: () => void;
  onPrev: () => void;
  onNext: () => void;
};

/** The CRT glass: the game's picture under scanlines, an on-screen display, and static between channels. */
export function TvScreen({ channel, total, done, spent, playing, picture, onAdd, onPrev, onNext }: Props) {
  const [isSwitching, setIsSwitching] = useState(true);

  useEffect(() => {
    setIsSwitching(true);
    const timer = setTimeout(() => setIsSwitching(false), STATIC_MS);

    return () => clearTimeout(timer);
  }, [channel]);

  return (
    <div className="crt absolute inset-0 rounded-[12%/16%] font-screen [container-type:size]">
      {picture && (
        <img
          key={picture.src}
          src={picture.src}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-500"
          style={{ filter: "saturate(1.25) contrast(1.12) brightness(0.72) blur(0.4px)" }}
        />
      )}
      <div className="crt-mask pointer-events-none absolute inset-0" />

      {channel ? (
        <Osd
          channel={channel}
          total={total}
          done={done}
          spent={spent}
          playing={playing}
          hasPicture={Boolean(picture)}
          onPrev={onPrev}
          onNext={onNext}
        />
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center gap-[4cqh] text-center screen-glow-text">
          <div className="crt-static pointer-events-none absolute inset-0 opacity-60" />
          <p className="relative text-[16cqh] leading-none">NO SIGNAL</p>
          <button onClick={onAdd} className="relative animate-pulse text-[8cqh] leading-none">
            ▶ ADD YOUR FIRST GAME
          </button>
        </div>
      )}

      <div
        className={cn(
          "crt-static pointer-events-none absolute inset-0 transition-opacity duration-200",
          isSwitching && channel ? "opacity-90" : "opacity-0",
        )}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_center,transparent_58%,rgb(0_0_0/0.6)_100%),linear-gradient(155deg,rgb(255_255_255/0.13),transparent_38%)]" />
    </div>
  );
}

function Osd({
  channel,
  total,
  done,
  spent,
  playing,
  hasPicture,
  onPrev,
  onNext,
}: {
  channel: string;
  total: number;
  done: number;
  spent: number;
  playing: Game[];
  hasPicture: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const money = useMoney();
  const pct = total ? Math.round((done / total) * 100) : 0;
  const list = hasPicture ? playing.slice(0, 1) : playing;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col px-[7cqw] py-[7cqh] text-[7.5cqh] leading-[1.05] screen-glow-text",
        hasPicture && "[text-shadow:0_0_2px_rgb(0_0_0),0_1px_3px_rgb(0_0_0),0_0_8px_var(--screen-glow)]",
      )}
    >
      <div className="flex items-baseline justify-between text-[11cqh]">
        <span className="truncate">CH·{channel.toUpperCase()}</span>
        <span className="text-screen-dim">{pct}%</span>
      </div>
      <div className="mt-[2cqh] flex justify-between gap-2">
        <span>GAMES {total}</span>
        <span>DONE {done}</span>
        <span className="truncate">{money(spent)}</span>
      </div>

      {hasPicture ? <div className="flex-1" /> : <div className="my-[3cqh] border-t border-dashed border-screen-dim/60" />}

      <p className="text-screen-dim">NOW PLAYING</p>
      <ul className={cn("mt-[1cqh] space-y-[1.5cqh] overflow-hidden", !hasPicture && "flex-1")}>
        {list.length === 0 && <li className="text-screen-dim">— nothing on —</li>}
        {list.map((g) => (
          <li key={g.id} className="flex items-center gap-[2cqw]">
            <span className="min-w-0 flex-1 truncate">{g.title}</span>
            <span className="text-screen-dim">{bar(g.progress)}</span>
            <span className="w-[14cqw] text-right">{g.progress}%</span>
          </li>
        ))}
      </ul>
      <div className="mt-[2cqh] flex justify-between text-screen-dim">
        <button onClick={onPrev} aria-label="Previous channel" className="hover:text-screen-text">
          ◀ CH
        </button>
        <button onClick={onNext} aria-label="Next channel" className="hover:text-screen-text">
          CH ▶
        </button>
      </div>
    </div>
  );
}
