import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { LayoutList, Library, LogOut, Plus, RefreshCw, Sparkles, Tv, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AccountDialog } from "@/components/lounge/AccountDialog";
import { HltbSyncDialog } from "@/components/lounge/HltbSyncDialog";
import { RecommendDialog } from "@/components/lounge/RecommendDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoomScene } from "@/components/lounge/RoomScene";
import { GameCard } from "@/components/lounge/GameCard";
import { GameDialog } from "@/components/lounge/GameDialog";
import { ThemePicker } from "@/components/lounge/ThemePicker";
import { signOut as firebaseSignOut } from "@/lib/auth";
import { STATUSES, groupByConsole, type Game, type GameStatus } from "@/lib/games";
import { useAccountSettings, useMoney } from "@/lib/settings";
import { gamesQuery, moveGame as saveStatus } from "@/lib/gamesStore";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useRoomTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/room")({
  loader: ({ context }) => context.queryClient.ensureQueryData(gamesQuery),
  component: Room,
});

function Room() {
  const { data: games } = useSuspenseQuery(gamesQuery);
  const [theme, setTheme] = useRoomTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<GameStatus | "all">("all");
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; game: Game | null }>({ open: false, game: null });
  const [view, setView] = useState<"room" | "list">("room");
  const [recOpen, setRecOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const hltb = useAccountSettings().data?.hltb ?? null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const money = useMoney();
  useDocumentTitle("Your Living Room — Backlog Lounge", "Your game collection, sorted by console, on a retro TV.");

  const consoles = useMemo(() => groupByConsole(games), [games]);
  const scoped = selected ? games.filter((g) => g.platform === selected) : games;
  const filtered = scoped.filter(
    (g) => (status === "all" || g.status === status) && g.title.toLowerCase().includes(q.toLowerCase()),
  );
  const totalSpent = games.reduce((s, g) => s + Number(g.price ?? 0), 0);
  const scored = games.filter((g) => g.score != null);
  const avg = scored.length ? scored.reduce((s, g) => s + Number(g.score), 0) / scored.length : null;

  const moveGame = async (g: Game, next: GameStatus) => {
    try {
      await saveStatus(g.id, next);
      qc.invalidateQueries({ queryKey: gamesQuery.queryKey });
    } catch (error) {
      console.error("Moving a game failed", error);
      toast.error("Couldn't move that game");
    }
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await firebaseSignOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <h1 className="font-display text-xl text-primary">Backlog Lounge</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border bg-card p-1" role="group" aria-label="View">
            <button onClick={() => setView("room")} aria-pressed={view === "room"} className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", view === "room" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}><Tv className="size-3.5" /> Room</button>
            <button onClick={() => setView("list")} aria-pressed={view === "list"} className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}><LayoutList className="size-3.5" /> Organize</button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRecOpen(true)}><Sparkles /> What to play?</Button>
          <ThemePicker value={theme} onChange={setTheme} />
          <Button asChild variant="outline">
            <Link to="/collection"><Library /> Collection</Link>
          </Button>
          <Button variant="retro" onClick={() => setDialog({ open: true, game: null })}>
            <Plus /> Add game
          </Button>
          {hltb && (
            <Button variant="ghost" size="icon" onClick={() => setIsSyncOpen(true)} aria-label="Sync with HowLongToBeat" title="Sync with HowLongToBeat">
              <RefreshCw />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsAccountOpen(true)} aria-label="Account settings" title="Account settings">
            <UserRound />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut />
          </Button>
        </div>
      </header>

      {view === "list" ? (
        <main className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((s) => {
            const col = games.filter((g) => g.status === s.value);
            return (
              <section key={s.value} className="rounded-xl border-2 bg-card p-3">
                <h2 className="mb-2 font-display text-lg">{s.label} <span className="text-sm text-muted-foreground">{col.length}</span></h2>
                <ul className="space-y-2">
                  {col.map((g) => (
                    <li key={g.id} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                      {g.cover_url ? <img src={g.cover_url} alt="" className="h-12 w-9 rounded object-cover" /> : <div className="h-12 w-9 rounded bg-muted" />}
                      <button className="min-w-0 flex-1 text-left" onClick={() => setDialog({ open: true, game: g })}>
                        <p className="truncate text-sm font-semibold">{g.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{g.platform}</p>
                      </button>
                      <select aria-label={`Move ${g.title}`} value={g.status} onChange={(e) => moveGame(g, e.target.value as GameStatus)} className="rounded border bg-card px-1 py-1 text-xs">
                        {STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </li>
                  ))}
                  {col.length === 0 && <li className="text-xs text-muted-foreground">Empty</li>}
                </ul>
              </section>
            );
          })}
        </main>
      ) : (
      <main className="mx-auto max-w-7xl space-y-8 px-4 pb-16">
        <RoomScene
          theme={theme}
          consoles={consoles}
          selected={selected}
          onSelect={setSelected}
          onAdd={() => setDialog({ open: true, game: null })}
          onPickGame={(g) => setDialog({ open: true, game: g })}
        />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Games" value={String(games.length)} />
          <Stat label="Finished" value={String(games.filter((g) => g.status === "done").length)} />
          <Stat label="Avg score" value={avg != null ? avg.toFixed(1) : "—"} />
          <Stat label="Spent" value={money(totalSpent)} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">
              {selected ? `${selected} shelf` : "The whole shelf"}
              {selected && (
                <button onClick={() => setSelected(null)} className="ml-3 align-middle text-sm font-normal text-muted-foreground underline">
                  show all
                </button>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter titles…" className="h-9 w-44" />
              <div className="flex rounded-full border bg-card p-1">
                {[{ value: "all" as const, label: "All" }, ...STATUSES].map((s) => {
                  const count = s.value === "all" ? scoped.length : scoped.filter((g) => g.status === s.value).length;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setStatus(s.value)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        status === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s.label} <span className="opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed p-10 text-center text-muted-foreground">
              Nothing here yet.{" "}
              <button className="font-semibold text-primary underline" onClick={() => setDialog({ open: true, game: null })}>
                Add a game
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filtered.map((g) => (
                <GameCard key={g.id} game={g} onOpen={() => setDialog({ open: true, game: g })} />
              ))}
            </div>
          )}
        </section>
      </main>
      )}

      <AccountDialog open={isAccountOpen} onOpenChange={setIsAccountOpen} onSyncHltb={() => setIsSyncOpen(true)} />
      {hltb && <HltbSyncDialog open={isSyncOpen} onOpenChange={setIsSyncOpen} connection={hltb} games={games} />}
      <RecommendDialog open={recOpen} onOpenChange={setRecOpen} games={games} onOpenGame={(g) => { setRecOpen(false); setDialog({ open: true, game: g }); }} />
      <GameDialog
        open={dialog.open}
        game={dialog.game}
        defaultPlatform={selected}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-2 bg-card p-4 shadow-chunky">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-2xl text-primary">{value}</p>
    </div>
  );
}
