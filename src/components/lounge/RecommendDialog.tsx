import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callApi } from "@/lib/auth";
import type { Game } from "@/lib/games";

type Recommendation = { gameId: string; title: string; reason: string };

const TIMES = [30, 60, 120, 240];

export function RecommendDialog({
  open, onOpenChange, games, onOpenGame,
}: { open: boolean; onOpenChange: (o: boolean) => void; games: Game[]; onOpenGame: (g: Game) => void }) {
  const [minutes, setMinutes] = useState(60);
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [pick, setPick] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setLoading(true); setError(null); setPick(null);
    try {
      const r = await callApi<{ pick?: Recommendation; error?: string }>("/api/recommend", { minutes, mood });
      if (r.pick) setPick(r.pick); else setError(r.error ?? "No answer.");
    } catch (e) { console.error("Recommendation request failed", e); setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };
  const game = pick ? games.find((g) => g.id === pick.gameId) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display text-2xl">What should I play?</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Time I have</p>
            <div className="flex flex-wrap items-center gap-2">
              {TIMES.map((t) => (
                <Button key={t} size="sm" variant={minutes === t ? "retro" : "outline"} onClick={() => setMinutes(t)}>
                  {t < 60 ? `${t} min` : `${t / 60} h`}
                </Button>
              ))}
              <Input type="number" min={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="h-9 w-20" aria-label="Minutes" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">I feel like…</p>
            <Textarea value={mood} onChange={(e) => setMood(e.target.value)} placeholder="something chill, a story, quick action…" rows={3} />
          </div>
          <Button variant="retro" className="w-full" onClick={ask} disabled={loading}>
            <Sparkles /> {loading ? "Thinking…" : "Pick a game from my backlog"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {pick && (
            <div className="flex gap-3 rounded-xl border-2 bg-card p-3 shadow-chunky">
              {game?.cover_url && <img src={game.cover_url} alt="" className="h-24 w-16 rounded object-cover" />}
              <div className="space-y-2">
                <p className="font-display text-xl text-primary">{pick.title}</p>
                <p className="text-sm text-muted-foreground">{pick.reason}</p>
                {game && <Button size="sm" variant="outline" onClick={() => onOpenGame(game)}>Open game</Button>}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
