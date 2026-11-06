import { consoleFamily } from "./games";

export type CaseStyle = {
  /** Plastic colour of the case and spine. */
  shell: string;
  /** Top banner colour on the cover; null for cases without one. */
  band: string | null;
  ink: string;
  label: string;
  /** Box size in millimetres: width, height and spine thickness. */
  w: number;
  h: number;
  depth: number;
};

const PS_BLUE = "#0b3a8c";
const XBOX_GREEN = "#107c10";
const SWITCH_RED = "#d8101a";
type Size = [w: number, h: number, depth: number];

const DVD: Size = [135, 190, 14];
const BLURAY: Size = [135, 170, 12];
const SWITCH: Size = [105, 170, 11];
const JEWEL: Size = [142, 125, 10];
const CART_BOX: Size = [180, 130, 35];

const style = (shell: string, band: string | null, label: string, [w, h, depth]: Size = DVD, ink = "#fff"): CaseStyle => ({
  shell,
  band,
  ink,
  label,
  w,
  h,
  depth,
});

const BY_NAME: Record<string, CaseStyle> = {
  ps5: style(PS_BLUE, "#f4f5f7", "PS5", BLURAY, PS_BLUE),
  ps4: style(PS_BLUE, PS_BLUE, "PS4", BLURAY),
  ps3: style("#1a1d24", "#1a1d24", "PS3", BLURAY),
  ps2: style("#121212", "#121212", "PlayStation 2"),
  ps1: style("#141414", null, "PlayStation", JEWEL),
  "ps vita": style(PS_BLUE, PS_BLUE, "PS Vita", [105, 135, 11]),
  "xbox series x|s": style(XBOX_GREEN, XBOX_GREEN, "Xbox Series X", BLURAY),
  "xbox one": style(XBOX_GREEN, XBOX_GREEN, "Xbox One", BLURAY),
  "xbox 360": style(XBOX_GREEN, XBOX_GREEN, "Xbox 360"),
  "switch 2": style(SWITCH_RED, SWITCH_RED, "Nintendo Switch 2", SWITCH),
  switch: style(SWITCH_RED, SWITCH_RED, "Nintendo Switch", SWITCH),
  "wii u": style("#1c9ad6", "#1c9ad6", "Wii U"),
  wii: style("#f2f2f2", null, "Wii", DVD, "#4a4a4a"),
  "3ds": style("#f2f2f2", SWITCH_RED, "3DS", [125, 137, 14]),
  gamecube: style("#141414", "#4d3f9a", "GameCube", [137, 190, 14]),
  n64: style("#202020", null, "Nintendo 64", CART_BOX),
  snes: style("#2a2a2a", null, "Super Nintendo", CART_BOX),
  "sega genesis": style("#141414", "#141414", "Genesis"),
  dreamcast: style("#f2f2f2", "#e4572e", "Dreamcast", JEWEL, "#333"),
};

const BY_FAMILY = {
  ps: BY_NAME["ps4"]!,
  xbox: BY_NAME["xbox series x|s"]!,
  nintendo: BY_NAME["switch"]!,
  pc: style("#161616", null, "PC"),
  retro: style("#202020", null, "Retro"),
};

export function caseStyle(platform: string): CaseStyle {
  return BY_NAME[platform.trim().toLowerCase()] ?? BY_FAMILY[consoleFamily(platform)];
}

/** Small stable number per game, for the natural lean and offset of each box. */
export function wobble(id: string, range: number) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;

  return ((Math.abs(hash) % 1000) / 1000 - 0.5) * 2 * range;
}
