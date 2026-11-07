import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Button } from "@/components/ui/button";
import { BookcaseFrame, ConsoleSection } from "@/components/lounge/Bookcase";
import { GameDialog } from "@/components/lounge/GameDialog";
import { ThemePicker } from "@/components/lounge/ThemePicker";
import {
  DEFAULT_FILTERS,
  SCORE_FILTERS,
  STATUSES,
  applyCollectionFilters,
  groupByConsole,
  isFiltered,
  type CollectionFilters,
  type Game,
} from "@/lib/games";
import { gamesQuery } from "@/lib/gamesStore";
import { useRoomTheme } from "@/lib/theme";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { cn } from "@/lib/utils";

const collectionSearchSchema = z.object({
  console: fallback(z.string(), DEFAULT_FILTERS.console).default(DEFAULT_FILTERS.console),
  status: fallback(z.string(), DEFAULT_FILTERS.status).default(DEFAULT_FILTERS.status),
  score: fallback(z.number(), DEFAULT_FILTERS.score).default(DEFAULT_FILTERS.score),
});

export const Route = createFileRoute("/_authenticated/collection")({
  validateSearch: zodValidator(collectionSearchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(gamesQuery),
  component: Collection,
});

function Collection() {
  const { data: games } = useSuspenseQuery(gamesQuery);
  const { console: consoleParam, status, score } = Route.useSearch();
  const filters: CollectionFilters = { console: consoleParam, status, score };
  const [theme, setTheme] = useRoomTheme();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<{ open: boolean; game: Game | null }>({ open: false, game: null });
  useDocumentTitle(
    "Collection Wall — Backlog Lounge",
    "Every game you own on a wall of shelves, sorted by console and narrowed by console, status or score.",
  );

  const setFilter = (patch: Partial<CollectionFilters>) =>
    navigate({ to: "/collection", search: (prev) => ({ ...prev, ...patch }), replace: true });

  /** How many games a chip would show, with the other filters still applied. */
  const countFor = (patch: Partial<CollectionFilters>) => applyCollectionFilters(games, { ...filters, ...patch }).length;

  const consoles = useMemo(() => groupByConsole(applyCollectionFilters(games, filters)), [games, filters]);
  const shown = consoles.reduce((s, c) => s + c.games.length, 0);
  const consoleNames = useMemo(() => groupByConsole(games).map((c) => c.name), [games]);

  return (
    <div className="min-h-screen overflow-x-clip room-wall">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to the living room">
            <Link to="/room"><ArrowLeft /></Link>
          </Button>
          <h1 className="font-display text-3xl text-primary">Collection Wall</h1>
        </div>
        <ThemePicker value={theme} onChange={setTheme} />
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16">
        <section aria-label="Filter the collection" className="wood mb-6 rounded-sm border-[6px] border-wood-dark p-3 shadow-chunky">
          <div className="space-y-2">
            <FilterGroup label="Console">
              <Chip active={filters.console === "all"} count={countFor({ console: "all" })} onClick={() => setFilter({ console: "all" })}>
                All
              </Chip>
              {consoleNames.map((name) => (
                <Chip key={name} active={filters.console === name} count={countFor({ console: name })} onClick={() => setFilter({ console: name })}>
                  {name}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Status">
              <Chip active={filters.status === "all"} count={countFor({ status: "all" })} onClick={() => setFilter({ status: "all" })}>
                All
              </Chip>
              {STATUSES.map((s) => (
                <Chip key={s.value} active={filters.status === s.value} count={countFor({ status: s.value })} onClick={() => setFilter({ status: s.value })}>
                  {s.label}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Score">
              {SCORE_FILTERS.map((s) => (
                <Chip key={s.value} active={filters.score === s.value} count={countFor({ score: s.value })} onClick={() => setFilter({ score: s.value })}>
                  {s.label}
                </Chip>
              ))}
            </FilterGroup>
          </div>
        </section>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <p className="font-screen text-lg text-shelf-label screen-glow-text">
              {shown} of {games.length} games on the wall
            </p>
            <StickerLegend />
          </div>
          {isFiltered(filters) && (
            <button
              onClick={() => navigate({ to: "/collection", search: () => ({ ...DEFAULT_FILTERS }), replace: true })}
              className="flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-semibold hover:text-primary"
            >
              <RotateCcw className="size-3" /> Clear filters
            </button>
          )}
        </div>

        {games.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed p-10 text-center text-muted-foreground">No games yet.</p>
        ) : consoles.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed p-10 text-center text-muted-foreground">
            No games match these filters.{" "}
            <button className="font-semibold text-primary underline" onClick={() => navigate({ to: "/collection", search: () => ({ ...DEFAULT_FILTERS }), replace: true })}>
              Clear filters
            </button>
          </p>
        ) : (
          <BookcaseFrame frame="clamp(0.6rem, 1.4vw, 1.1rem)" className="[--mm:1.1px] sm:[--mm:1.3px] lg:[--mm:1.45px]">
            <div className="space-y-1 pt-6">
              {consoles.map((c) => (
                <ConsoleSection key={c.name} name={c.name} games={c.games} onPick={(g) => setDialog({ open: true, game: g })} />
              ))}
            </div>
          </BookcaseFrame>
        )}
      </main>

      <GameDialog open={dialog.open} game={dialog.game} defaultPlatform={null} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />
    </div>
  );
}

function StickerLegend() {
  return (
    <ul aria-label="Spine stickers" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-shelf-label">
      {STATUSES.map((s) => (
        <li key={s.value} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full ring-1 ring-black/30" style={{ background: `var(--status-${s.value})` }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={`${label} filter`} className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 font-screen text-lg uppercase tracking-wider text-shelf-label">{label}</span>
      <div className="flex flex-wrap items-center gap-1 rounded-full border bg-card p-1">{children}</div>
    </div>
  );
}

function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children} <span className="opacity-60">{count}</span>
    </button>
  );
}

