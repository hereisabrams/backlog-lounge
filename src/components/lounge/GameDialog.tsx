import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Link2, Loader2, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { callApi } from "@/lib/auth";
import { resizeCover } from "@/lib/coverImage";
import { CONSOLES, STATUS_CLASS, STATUSES, normalizePlatform, toGameFields, type Game, type GameForm } from "@/lib/games";
import { createGame, deleteGame, gamesQuery, updateGame } from "@/lib/gamesStore";
import { cn } from "@/lib/utils";

type RawgResult = { id: number; name: string; released: string | null; cover: string | null; platforms: string[] };
type GameArt = { box: string | null; hero: string | null };

const STORES = ["PlayStation Store", "Xbox Store", "Nintendo eShop", "Steam", "Epic", "GOG", "Amazon", "GameStop", "Best Buy", "Walmart", "Target", "Used / Garage sale", "Gift"];

const empty = (platform = ""): GameForm => ({
  title: "",
  platform,
  status: "backlog",
  score: "",
  progress: 0,
  price: "",
  store: "",
  cover_url: "",
  hero_url: "",
  rawg_id: null,
  notes: "",
});

export function GameDialog({
  open,
  onOpenChange,
  game,
  defaultPlatform,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  game: Game | null;
  defaultPlatform?: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<GameForm>(empty());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RawgResult[]>([]);
  const [platformHints, setPlatformHints] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [coverMode, setCoverMode] = useState<"none" | "url">("none");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSearchError(null);
    setCoverMode("none");
    setPlatformHints([]);
    if (game) {
      setForm({
        title: game.title,
        platform: game.platform,
        status: game.status,
        score: game.score != null ? String(game.score) : "",
        progress: game.progress,
        price: game.price != null ? String(game.price) : "",
        store: game.store ?? "",
        cover_url: game.cover_url ?? "",
        hero_url: game.hero_url ?? "",
        rawg_id: game.rawg_id,
        notes: game.notes ?? "",
      });
    } else setForm(empty(defaultPlatform ?? ""));
  }, [open, game, defaultPlatform]);

  useEffect(() => {
    if (game || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await callApi<{ results: RawgResult[]; error?: string }>("/api/search-games", { query });
        setResults(r.results);
        setSearchError(r.error ?? null);
      } catch (error) {
        console.error("Game search failed", error);
        setSearchError("Search failed.");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, game]);

  const set = <K extends keyof GameForm>(k: K, v: GameForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pick = (r: RawgResult) => {
    const plats = [...new Set(r.platforms.map(normalizePlatform))];
    setPlatformHints(plats);
    setForm((f) => ({
      ...f,
      title: r.name,
      cover_url: r.cover ?? f.cover_url,
      hero_url: r.cover ?? f.hero_url,
      rawg_id: r.id,
      platform: f.platform || plats[0] || "",
    }));
    setResults([]);
    setQuery("");
    callApi<GameArt>("/api/game-art", { rawgId: r.id })
      .then((art) =>
        setForm((f) =>
          f.rawg_id !== r.id ? f : { ...f, cover_url: art.box ?? f.cover_url, hero_url: art.hero ?? f.hero_url },
        ),
      )
      .catch((error) => console.warn("Box art lookup failed", error));
  };

  const save = useMutation({
    mutationFn: async () => {
      const fields = toGameFields(form);
      if (game) {
        await updateGame(game.id, fields);

        return;
      }

      await createGame(fields);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamesQuery.queryKey });
      toast.success(game ? "Saved" : `${form.title} is on the shelf`);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Saving a game failed", error);
      toast.error(error.message === "Add a title and a console" ? error.message : "Couldn't save that game. Try again.");
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!game) return;

      await deleteGame(game.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamesQuery.queryKey });
      toast("Removed from the shelf");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Removing a game failed", error);
      toast.error("Couldn't remove that game. Try again.");
    },
  });

  const upload = async (file: File) => {
    setUploading(true);
    try {
      set("cover_url", await resizeCover(file));
    } catch (error) {
      console.error("Reading the cover image failed", error);
      toast.error("That image couldn't be used. Try a JPG or PNG.");
    } finally {
      setUploading(false);
    }
  };

  const consoleOptions = [...new Set([...platformHints, ...CONSOLES.map((c) => c.name)])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{game ? "Edit game" : "Add a game"}</DialogTitle>
        </DialogHeader>

        {!game && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any game… (e.g. Elden Ring)"
              className="h-11 pl-9"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />}
            {searchError && <p className="mt-1 text-xs text-destructive">{searchError} You can still fill it in by hand.</p>}
            {results.length > 0 && (
              <ul className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pick(r)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                    >
                      {r.cover ? (
                        <img src={r.cover} alt="" className="h-10 w-14 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-14 rounded bg-muted" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.released?.slice(0, 4)} · {r.platforms.slice(0, 4).join(", ")}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          {/* cover */}
          <div className="space-y-2">
            <div className="aspect-[3/4] overflow-hidden rounded-lg border-2 bg-muted">
              {form.cover_url ? (
                <img src={form.cover_url} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">No cover yet</div>
              )}
            </div>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Upload
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setCoverMode(coverMode === "url" ? "none" : "url")} aria-label="Cover from link">
                <Link2 />
              </Button>
            </div>
            {coverMode === "url" && (
              <Input placeholder="Paste image link" value={form.cover_url} onChange={(e) => set("cover_url", e.target.value)} />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Console</Label>
                <Input list="console-list" value={form.platform} onChange={(e) => set("platform", e.target.value)} placeholder="PS5, Switch, PC…" />
                <datalist id="console-list">
                  {consoleOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {platformHints.length > 1 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {platformHints.slice(0, 6).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => set("platform", p)}
                        className={cn("rounded-full border px-2 py-0.5 text-[11px]", form.platform === p && "bg-primary text-primary-foreground")}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("status", s.value)}
                    className={cn(
                      "rounded-md border-2 py-2 text-sm font-semibold transition-colors",
                      form.status === s.value ? cn(STATUS_CLASS[s.value], "border-foreground/40 text-foreground") : "hover:bg-muted",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Progress</Label>
                <span className="font-display text-sm text-primary">{form.progress}%</span>
              </div>
              <Slider value={[form.progress]} max={100} step={5} onValueChange={([v]) => set("progress", v ?? 0)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Score /10</Label>
                <Input type="number" min={0} max={10} step={0.5} value={form.score} onChange={(e) => set("score", e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-1.5">
                <Label>Paid</Label>
                <Input type="number" min={0} step={0.01} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="$0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Bought at</Label>
                <Input list="store-list" value={form.store} onChange={(e) => set("store", e.target.value)} placeholder="Store" />
                <datalist id="store-list">
                  {STORES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Where you left off, thoughts…" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {game ? (
            <Button variant="ghost" className="text-destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
              <Trash2 /> Remove
            </Button>
          ) : (
            <span />
          )}
          <Button variant="retro" size="lg" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {game ? "Save" : "Put it on the shelf"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
