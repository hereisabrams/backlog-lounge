import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { RoomScene } from "@/components/lounge/RoomScene";
import { ThemePicker } from "@/components/lounge/ThemePicker";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/lib/auth";
import { DEMO_CONSOLES } from "@/lib/demo";
import { useRoomTheme } from "@/lib/theme";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (await currentUser()) throw redirect({ to: "/room", replace: true });
  },
  component: Landing,
});

function Landing() {
  const [theme, setTheme] = useRoomTheme();
  const [selected, setSelected] = useState<string | null>("PS5");
  useDocumentTitle(
    "Backlog Lounge — track your games in a retro living room",
    "Your games sorted by console on an old TV. Track backlog, playing, stopped and done with scores, progress and what you paid.",
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-display text-2xl text-primary">Backlog Lounge</span>
        <div className="flex items-center gap-2">
          <ThemePicker value={theme} onChange={setTheme} />
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-5xl leading-[1.05] text-balance text-foreground md:text-6xl">
            Every game you own, <span className="text-primary">plugged into one old TV.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Add a game and its console shows up on the shelf. Track backlog, playing, stopped and done — with scores, progress and what you paid.
          </p>
          <Button asChild variant="retro" size="lg" className="mt-6">
            <Link to="/room">Enter your living room</Link>
          </Button>
        </div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Example room</p>
        <RoomScene theme={theme} consoles={DEMO_CONSOLES} selected={selected} onSelect={setSelected} onAdd={() => {}} />
      </main>
    </div>
  );
}
