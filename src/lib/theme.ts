import { useEffect, useState } from "react";

export type RoomTheme = "seventies" | "eighties" | "nineties";

export const THEMES: { value: RoomTheme; label: string; swatch: string }[] = [
  { value: "seventies", label: "’70s Den", swatch: "70s" },
  { value: "eighties", label: "’80s Neon", swatch: "80s" },
  { value: "nineties", label: "’90s Bedroom", swatch: "90s" },
];

const KEY = "room-theme";

function savedTheme(): RoomTheme {
  const saved = localStorage.getItem(KEY);

  return THEMES.find((t) => t.value === saved)?.value ?? "seventies";
}

export function useRoomTheme() {
  const [theme, setTheme] = useState<RoomTheme>(savedTheme);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return [theme, setTheme] as const;
}
