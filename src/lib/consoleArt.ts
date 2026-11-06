import dreamcast from "@/assets/consoles/dreamcast.webp";
import gamecube from "@/assets/consoles/gamecube.webp";
import genesis from "@/assets/consoles/genesis.webp";
import mobile from "@/assets/consoles/mobile.webp";
import n64 from "@/assets/consoles/n64.webp";
import nintendo3ds from "@/assets/consoles/3ds.webp";
import pc from "@/assets/consoles/pc.webp";
import ps1 from "@/assets/consoles/ps1.webp";
import ps2 from "@/assets/consoles/ps2.webp";
import ps3 from "@/assets/consoles/ps3.webp";
import ps4 from "@/assets/consoles/ps4.webp";
import ps5 from "@/assets/consoles/ps5.webp";
import snes from "@/assets/consoles/snes.webp";
import steamdeck from "@/assets/consoles/steamdeck.webp";
import nswitch from "@/assets/consoles/switch.webp";
import switch2 from "@/assets/consoles/switch2.webp";
import vita from "@/assets/consoles/vita.webp";
import wii from "@/assets/consoles/wii.webp";
import wiiu from "@/assets/consoles/wiiu.webp";
import xbox360 from "@/assets/consoles/xbox360.webp";
import xboxone from "@/assets/consoles/xboxone.webp";
import xboxseries from "@/assets/consoles/xboxseries.webp";
import { consoleFamily, type ConsoleFamily } from "./games";

export type ConsoleArt = {
  src: string;
  /** Width of the photo's subject in real centimetres, so consoles keep their real size next to the TV. */
  cm: number;
  /** Height / width of the image. */
  aspect: number;
  /** Flat boxes other consoles can sit on. */
  isStackable: boolean;
  /** Share of the image height that is the visible top surface, where something stacked on it rests. */
  top: number;
};

const art = (src: string, cm: number, w: number, h: number, isStackable = false, top = 0.4): ConsoleArt => ({
  src,
  cm,
  aspect: h / w,
  isStackable,
  top,
});

const ART = {
  ps5: art(ps5, 40, 900, 326, true, 0.3),
  ps4: art(ps4, 34, 900, 397, true, 0.5),
  ps3: art(ps3, 34, 900, 536, true, 0.55),
  ps2: art(ps2, 33, 900, 506, true, 0.5),
  ps1: art(ps1, 44, 900, 377),
  vita: art(vita, 18, 900, 521),
  xboxseries: art(xboxseries, 34, 900, 444, true, 0.4),
  xboxone: art(xboxone, 40, 900, 565, true, 0.5),
  xbox360: art(xbox360, 37, 900, 566, true, 0.45),
  switch2: art(switch2, 28, 900, 452),
  switch: art(nswitch, 25, 900, 478),
  wiiu: art(wiiu, 30, 900, 571, true, 0.5),
  wii: art(wii, 19, 818, 900),
  nintendo3ds: art(nintendo3ds, 13.5, 900, 815),
  gamecube: art(gamecube, 19, 900, 875),
  n64: art(n64, 29, 900, 567),
  snes: art(snes, 28, 900, 620),
  pc: art(pc, 34, 692, 884),
  steamdeck: art(steamdeck, 30, 900, 335),
  mobile: art(mobile, 7.5, 332, 710),
  genesis: art(genesis, 31, 900, 500),
  dreamcast: art(dreamcast, 23, 900, 629),
} satisfies Record<string, ConsoleArt>;

type ArtKey = keyof typeof ART;

const BY_NAME: Record<string, ArtKey> = {
  ps5: "ps5",
  "playstation 5": "ps5",
  ps4: "ps4",
  "playstation 4": "ps4",
  ps3: "ps3",
  "playstation 3": "ps3",
  ps2: "ps2",
  "playstation 2": "ps2",
  ps1: "ps1",
  psx: "ps1",
  playstation: "ps1",
  "ps vita": "vita",
  vita: "vita",
  psp: "vita",
  "xbox series x|s": "xboxseries",
  "xbox series x": "xboxseries",
  "xbox series s": "xboxseries",
  "xbox one": "xboxone",
  "xbox 360": "xbox360",
  "switch 2": "switch2",
  "nintendo switch 2": "switch2",
  switch: "switch",
  "nintendo switch": "switch",
  "wii u": "wiiu",
  wii: "wii",
  "3ds": "nintendo3ds",
  "nintendo 3ds": "nintendo3ds",
  "2ds": "nintendo3ds",
  ds: "nintendo3ds",
  gamecube: "gamecube",
  n64: "n64",
  "nintendo 64": "n64",
  snes: "snes",
  "super nintendo": "snes",
  nes: "snes",
  pc: "pc",
  "steam deck": "steamdeck",
  mobile: "mobile",
  ios: "mobile",
  android: "mobile",
  "sega genesis": "genesis",
  genesis: "genesis",
  "mega drive": "genesis",
  dreamcast: "dreamcast",
};

const BY_FAMILY: Record<ConsoleFamily, ArtKey> = {
  ps: "ps4",
  xbox: "xboxseries",
  nintendo: "switch",
  pc: "pc",
  retro: "snes",
};

export function consoleArt(platform: string): ConsoleArt {
  const key = BY_NAME[platform.trim().toLowerCase()] ?? BY_FAMILY[consoleFamily(platform)];

  return ART[key];
}
