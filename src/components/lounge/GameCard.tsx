import { FAMILY_BG, STATUS_CLASS, STATUSES, consoleFamily, formatHours, formatMoney, hoursLeft, type Game } from "@/lib/games";
import { cn } from "@/lib/utils";

function playTimeLabel(game: Game) {
  if (game.status === "done" || !game.time_normal) return null;

  const left = hoursLeft(game);
  if (game.progress > 0 && left != null) return `${formatHours(left)} left`;

  return `~${formatHours(game.time_normal)}`;
}

export function GameCard({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const status = game.status;
  const playTime = playTimeLabel(game);
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-lg border-2 bg-card text-left shadow-chunky transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={`${game.title} cover`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center font-display text-lg text-muted-foreground">
            {game.title}
          </div>
        )}
        <span
          className={cn(
            "absolute left-0 top-0 rounded-br-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground",
            FAMILY_BG[consoleFamily(game.platform)],
          )}
        >
          {game.platform}
        </span>
        {game.score != null && (
          <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary font-display text-sm text-secondary-foreground">
            {Number(game.score)}
          </span>
        )}
        <span
          className={cn(
            "absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-foreground",
            STATUS_CLASS[status],
          )}
        >
          {STATUSES.find((s) => s.value === status)?.label}
        </span>
      </div>
      <div className="space-y-1.5 p-2.5">
        <p className="line-clamp-1 text-sm font-semibold">{game.title}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full", STATUS_CLASS[status])} style={{ width: `${game.progress}%` }} />
        </div>
        <div className="flex justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="shrink-0 tabular-nums">
            {game.progress}%{playTime && ` · ${playTime}`}
          </span>
          <span className="truncate">
            {game.price != null ? formatMoney(Number(game.price)) : ""}
            {game.store ? ` · ${game.store}` : ""}
          </span>
        </div>
      </div>
    </button>
  );
}
