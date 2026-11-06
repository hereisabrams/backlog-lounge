import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, RefreshCw, Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, callApi } from "@/lib/auth";
import { clearHltbConnection, saveHltbConnection, settingsQuery, type HltbConnection } from "@/lib/settings";

type ConnectResponse = { sealed: string; userId: number; userName: string | null };

/** Account → HowLongToBeat: connect with a session cookie, start a sync, or disconnect. */
export function HltbPanel({ connection, onSync }: { connection: HltbConnection | null; onSync: () => void }) {
  const qc = useQueryClient();
  const [cookie, setCookie] = useState("");
  const [error, setError] = useState<string | null>(null);

  const connect = useMutation({
    mutationFn: async () => {
      const response = await callApi<ConnectResponse>("/api/hltb-connect", { cookie });
      await saveHltbConnection({ ...response, connectedAt: Date.now() });

      return response;
    },
    onSuccess: (response) => {
      setCookie("");
      setError(null);
      qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
      toast.success(`Connected to HowLongToBeat${response.userName ? ` as ${response.userName}` : ""}`);
    },
    onError: (failure: Error) => {
      console.error("Connecting HowLongToBeat failed", failure);
      setError(failure instanceof ApiError ? failure.message : "Couldn't reach HowLongToBeat. Try again.");
    },
  });

  const disconnect = useMutation({
    mutationFn: clearHltbConnection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
      toast("Disconnected from HowLongToBeat");
    },
    onError: (failure: Error) => {
      console.error("Disconnecting HowLongToBeat failed", failure);
      toast.error("Couldn't disconnect. Try again.");
    },
  });

  if (connection) {
    return (
      <section className="space-y-2" aria-labelledby="hltb-label">
        <Label id="hltb-label">HowLongToBeat</Label>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 bg-card p-3">
          <p className="text-sm">
            Connected{connection.userName ? <> as <span className="font-semibold">{connection.userName}</span></> : ""}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              <Unplug /> Disconnect
            </Button>
            <Button variant="outline" size="sm" onClick={onSync}>
              <RefreshCw /> Sync now
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2" aria-labelledby="hltb-label">
      <Label id="hltb-label">HowLongToBeat</Label>
      <p className="text-xs text-muted-foreground">Two-way sync of status and ratings with your HowLongToBeat lists.</p>
      <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
        <li>
          Sign in at{" "}
          <a href="https://howlongtobeat.com/login" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline">
            howlongtobeat.com <ExternalLink className="size-3" />
          </a>
        </li>
        <li>Open developer tools → Application → Cookies → howlongtobeat.com and copy the value of hltb_alive.</li>
        <li>Paste it here. It's encrypted before it's stored; nobody can read it back.</li>
      </ol>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (cookie.trim()) connect.mutate();
        }}
      >
        <Input
          type="password"
          autoComplete="off"
          value={cookie}
          onChange={(event) => setCookie(event.target.value)}
          placeholder="hltb_alive cookie"
          aria-label="HowLongToBeat session cookie"
          aria-invalid={Boolean(error)}
        />
        <Button type="submit" variant="outline" disabled={!cookie.trim() || connect.isPending}>
          {connect.isPending && <Loader2 className="animate-spin" />}
          Connect
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
