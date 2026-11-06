import { THEMES, type RoomTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemePicker({ value, onChange }: { value: RoomTheme; onChange: (t: RoomTheme) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border bg-card p-1" role="radiogroup" aria-label="Room style">
      {THEMES.map((t) => (
        <button
          key={t.value}
          role="radio"
          aria-checked={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            value === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          title={t.label}
        >
          {t.swatch}
        </button>
      ))}
    </div>
  );
}
