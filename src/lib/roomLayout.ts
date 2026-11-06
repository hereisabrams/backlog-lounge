export type LayoutItem = {
  key: string;
  /** Width in % of the scene at real size. */
  width: number;
  isStackable: boolean;
};

export type LayoutColumn<T extends LayoutItem> = {
  /** Bottom first. */
  items: T[];
  width: number;
};

export type ZoneLayout<T extends LayoutItem> = { columns: LayoutColumn<T>[]; scale: number };

const MAX_STACK = 3;

const columnWidth = <T extends LayoutItem>(items: T[]) => items[0]?.width ?? 0;

const totalWidth = <T extends LayoutItem>(columns: LayoutColumn<T>[], gap: number) =>
  columns.reduce((sum, c) => sum + c.width, 0) + Math.max(0, columns.length - 1) * gap;

/**
 * Lays consoles side by side in a zone of the cabinet. When they don't fit, flat consoles are stacked
 * on top of wider flat ones (the way people do it), and only then everything is scaled down to fit.
 */
export function layoutZone<T extends LayoutItem>(items: T[], zoneWidth: number, gap: number): ZoneLayout<T> {
  let columns: LayoutColumn<T>[] = items.map((item) => ({ items: [item], width: item.width }));

  while (totalWidth(columns, gap) > zoneWidth) {
    const movable = columns
      .filter((c) => c.items.length === 1 && c.items[0]!.isStackable)
      .sort((a, b) => a.width - b.width);
    const move = movable
      .flatMap((source) =>
        columns
          .filter((target) => {
            const top = target.items[target.items.length - 1]!;

            return target !== source && top.isStackable && target.items.length < MAX_STACK && top.width >= source.width * 0.9;
          })
          .map((target) => ({ source, target })),
      )
      .at(0);
    if (!move) break;

    move.target.items = [...move.target.items, ...move.source.items];
    move.target.width = columnWidth(move.target.items);
    columns = columns.filter((c) => c !== move.source);
  }

  const needed = totalWidth(columns, gap);

  return { columns, scale: needed > zoneWidth ? zoneWidth / needed : 1 };
}
