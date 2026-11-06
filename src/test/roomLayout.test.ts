import { describe, expect, it } from "vitest";
import { layoutZone } from "@/lib/roomLayout";

const item = (key: string, width: number, isStackable = true) => ({ key, width, isStackable });

describe("layoutZone", () => {
  it("puts consoles side by side at real size when they fit", () => {
    const layout = layoutZone([item("ps5", 6), item("switch", 4, false)], 20, 1);
    expect(layout.columns.map((c) => c.items.map((i) => i.key))).toEqual([["ps5"], ["switch"]]);
    expect(layout.scale).toBe(1);
  });

  it("stacks a flat console on a wider flat one before shrinking anything", () => {
    const layout = layoutZone([item("ps5", 10), item("ps4", 8), item("switch", 5, false)], 16, 1);
    expect(layout.columns.map((c) => c.items.map((i) => i.key))).toEqual([["ps5", "ps4"], ["switch"]]);
    expect(layout.scale).toBe(1);
  });

  it("never stacks on consoles that aren't flat, and scales down as a last resort", () => {
    const layout = layoutZone([item("pc", 10, false), item("wii", 8, false)], 9, 1);
    expect(layout.columns).toHaveLength(2);
    expect(layout.scale).toBeCloseTo(9 / 19);
  });

  it("stacks at most three high", () => {
    const layout = layoutZone([item("a", 10), item("b", 10), item("c", 10), item("d", 10)], 10, 0);
    expect(Math.max(...layout.columns.map((c) => c.items.length))).toBe(3);
    expect(layout.scale).toBeCloseTo(0.5);
  });
});
