import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import { CURRENCIES, DEFAULT_CURRENCY, formatMoney, type Currency } from "@/lib/games";
import { saveCurrency, settingsQuery, useAccountSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { HltbPanel } from "./HltbPanel";

const SAMPLE_PRICE = 59.99;

export function AccountDialog({
  open,
  onOpenChange,
  onSyncHltb,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncHltb: () => void;
}) {
  const qc = useQueryClient();
  const { data: settings } = useAccountSettings();
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const user = auth.currentUser;

  useEffect(() => {
    if (open) setCurrency(settings?.currency ?? DEFAULT_CURRENCY);
  }, [open, settings]);

  const save = useMutation({
    mutationFn: () => saveCurrency(currency),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
      toast.success(`Prices now show in ${currency}`);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Saving account settings failed", error);
      toast.error("Couldn't save your settings. Try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Account</DialogTitle>
          <DialogDescription className="sr-only">Your account and display settings</DialogDescription>
        </DialogHeader>

        {user && (
          <div className="flex items-center gap-3 rounded-lg border-2 bg-card p-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="size-10 rounded-full" />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-full bg-muted font-display text-lg">
                {(user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              {user.displayName && <p className="truncate text-sm font-semibold">{user.displayName}</p>}
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}

        <div role="radiogroup" aria-labelledby="currency-label" className="space-y-2">
          <Label id="currency-label">Currency</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {CURRENCIES.map((option) => (
              <button
                key={option.code}
                type="button"
                role="radio"
                aria-checked={currency === option.code}
                onClick={() => setCurrency(option.code)}
                title={option.label}
                className={cn(
                  "flex flex-col items-center rounded-md border-2 px-2 py-2 transition-colors",
                  currency === option.code ? "border-foreground/40 bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span className="text-sm font-semibold">{option.code}</span>
                <span className={cn("text-xs tabular-nums", currency === option.code ? "opacity-85" : "text-muted-foreground")}>
                  {formatMoney(SAMPLE_PRICE, option.code)}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Prices you've entered aren't converted; this changes how they're shown.</p>
        </div>

        <div className="flex justify-end">
          <Button variant="retro" onClick={() => save.mutate()} disabled={save.isPending || currency === (settings?.currency ?? DEFAULT_CURRENCY)}>
            {save.isPending && <Loader2 className="animate-spin" />}
            Save currency
          </Button>
        </div>

        <div className="border-t pt-4">
          <HltbPanel
            connection={settings?.hltb ?? null}
            onSync={() => {
              onOpenChange(false);
              onSyncHltb();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
