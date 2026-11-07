import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Gamepad2, Loader2, Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { HltbEntry } from "../../../api/_lib/hltbMap";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, callApi } from "@/lib/auth";
import { STATUSES, type Game, type GameStatus } from "@/lib/games";
import { gamesQuery } from "@/lib/gamesStore";
import { planSync, runSync, type SyncPlan, type SyncResult } from "@/lib/hltbSync";
import type { HltbConnection } from "@/lib/settings";

type Stage =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "preview"; plan: SyncPlan }
  | { kind: "syncing"; done: number; total: number }
  | { kind: "finished"; result: SyncResult };

const statusLabel = (status: GameStatus) => STATUSES.find((s) => s.value === status)?.label ?? status;

const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Couldn't reach HowLongToBeat. Try again.");

export function HltbSyncDialog({
  open,
  onOpenChange,
  connection,
  games,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: HltbConnection;
  games: Game[];
}) {
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>({ kind: "loading" });

  useEffect(() => {
    if (!open) return;

    let isCurrent = true;
    setStage({ kind: "loading" });
    callApi<{ entries: HltbEntry[] }>("/api/hltb-list", { sealed: connection.sealed })
      .then(({ entries }) => isCurrent && setStage({ kind: "preview", plan: planSync(games, entries) }))
      .catch((error) => {
        console.error("Reading HowLongToBeat lists failed", error);
        if (isCurrent) setStage({ kind: "error", message: errorMessage(error) });
      });

    return () => {
      isCurrent = false;
    };
    // The plan is taken once per opening; re-planning while the user reads it would move the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connection.sealed]);

  const start = async (plan: SyncPlan) => {
    setStage({ kind: "syncing", done: 0, total: 0 });
    try {
      const result = await runSync(plan, connection.sealed, plan.owned, (done, total) => setStage({ kind: "syncing", done, total }));
      setStage({ kind: "finished", result });
      if (result.failed) toast.error(`${result.failed} change${result.failed === 1 ? "" : "s"} didn't reach HowLongToBeat`);
    } catch (error) {
      console.error("HowLongToBeat sync failed", error);
      setStage({ kind: "error", message: errorMessage(error) });
    } finally {
      qc.invalidateQueries({ queryKey: gamesQuery.queryKey });
    }
  };

  const isBusy = stage.kind === "syncing";

  return (
    <Dialog open={open} onOpenChange={(next) => !isBusy && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Sync with HowLongToBeat</DialogTitle>
          <DialogDescription>Status and ratings, both ways. Where both sides changed, the newer change wins.</DialogDescription>
        </DialogHeader>

        {stage.kind === "loading" && (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Reading your HowLongToBeat lists…
          </p>
        )}

        {stage.kind === "error" && <p className="py-4 text-sm text-destructive">{stage.message}</p>}

        {stage.kind === "preview" && <PlanPreview plan={stage.plan} onStart={() => start(stage.plan)} />}

        {stage.kind === "syncing" && (
          <div className="space-y-2 py-4">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Syncing{stage.total ? ` ${stage.done} of ${stage.total}` : "…"}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${stage.total ? (stage.done / stage.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {stage.kind === "finished" && (
          <div className="space-y-4 py-2">
            <p className="text-sm">
              Done: {stage.result.imported} imported, {stage.result.pulled} updated here, {stage.result.pushed} updated on HowLongToBeat
              {stage.result.refiled ? `, ${stage.result.refiled} moved to the right console` : ""}
              {stage.result.failed ? `, ${stage.result.failed} failed` : ""}.
            </p>
            <div className="flex justify-end">
              <Button variant="retro" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanPreview({ plan, onStart }: { plan: SyncPlan; onStart: () => void }) {
  const changes = plan.imports.length + plan.pulls.length + plan.pushes.length + plan.refiles.length;

  return (
    <div className="space-y-3">
      <PlanGroup icon={<Plus />} title="Add here" count={plan.imports.length}>
        {plan.imports.map((entry) => (
          <PlanRow key={entry.submissionId} title={entry.title} detail={`${entry.platform || "—"} · ${statusLabel(entry.status)}`} />
        ))}
      </PlanGroup>
      <PlanGroup icon={<ArrowDownToLine />} title="Update here" count={plan.pulls.length}>
        {plan.pulls.map(({ game, entry }) => (
          <PlanRow key={game.id} title={game.title} detail={changeDetail(game, entry.status, entry.score, game.status, game.score)} />
        ))}
      </PlanGroup>
      <PlanGroup icon={<ArrowUpFromLine />} title="Update on HowLongToBeat" count={plan.pushes.length}>
        {plan.pushes.map(({ game, entry }) => (
          <PlanRow key={game.id} title={game.title} detail={changeDetail(game, game.status, game.score, entry.status, entry.score)} />
        ))}
      </PlanGroup>
      <PlanGroup icon={<Gamepad2 />} title="Fix console" count={plan.refiles.length}>
        {plan.refiles.map(({ game }) => (
          <PlanRow key={game.id} title={game.title} detail={`${game.platform} → a console you own, else PC`} />
        ))}
      </PlanGroup>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowLeftRight className="size-3.5" />
        {plan.links.length} already match · {plan.onlyHere.length} only in Backlog Lounge (not added to HowLongToBeat)
      </p>
      <div className="flex justify-end pt-1">
        <Button variant="retro" size="lg" onClick={onStart} disabled={changes === 0 && plan.links.length === 0}>
          {changes === 0 ? "Everything's in sync" : `Sync ${changes} change${changes === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

function changeDetail(game: Game, status: GameStatus, score: number | null, fromStatus: GameStatus, fromScore: number | null) {
  const parts = [];
  if (status !== fromStatus) parts.push(`${statusLabel(fromStatus)} → ${statusLabel(status)}`);
  if ((score ?? 0) !== (fromScore ?? 0)) parts.push(`score ${fromScore ?? "—"} → ${score ?? "—"}`);

  return parts.join(" · ") || game.platform;
}

function PlanGroup({ icon, title, count, children }: { icon: ReactNode; title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;

  return (
    <section className="rounded-lg border-2 bg-card">
      <h3 className="flex items-center gap-2 border-b px-3 py-2 text-sm font-semibold [&_svg]:size-4">
        {icon} {title} <span className="text-muted-foreground">{count}</span>
      </h3>
      <ul className="max-h-40 divide-y overflow-y-auto">{children}</ul>
    </section>
  );
}

function PlanRow({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-sm">
      <span className="min-w-0 truncate">{title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{detail}</span>
    </li>
  );
}
