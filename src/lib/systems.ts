export type SystemId = "gb" | "gba" | "ps2";

export interface SystemDef {
  id: SystemId;
  name: string;
  shortName: string;
  year: string;
  /** EmulatorJS core name, or null when the system can't run in a browser yet. */
  core: string | null;
  engine: string;
  extensions: string[];
  status: "ready" | "planned";
  note: string;
  accent: string;
}

export const SYSTEMS: Record<SystemId, SystemDef> = {
  gb: {
    id: "gb",
    name: "Game Boy & Game Boy Color",
    shortName: "Game Boy",
    year: "1989 / 1998",
    core: "gb",
    engine: "Gambatte",
    extensions: [".gb", ".gbc"],
    status: "ready",
    note: "Runs in the browser with save states and battery saves.",
    accent: "#6f7f14",
  },
  gba: {
    id: "gba",
    name: "Game Boy Advance",
    shortName: "GBA",
    year: "2001",
    core: "gba",
    engine: "mGBA",
    extensions: [".gba"],
    status: "ready",
    note: "Runs in the browser with save states and battery saves.",
    accent: "#5b45c8",
  },
  ps2: {
    id: "ps2",
    name: "PlayStation 2",
    shortName: "PS2",
    year: "2000",
    core: null,
    engine: "PCSX2 (desktop app)",
    extensions: [".iso", ".chd", ".cso"],
    status: "planned",
    note: "PS2 needs more power than a browser tab gives. Your PS2 games are listed now and will launch from the desktop app.",
    accent: "#2f5fe0",
  },
};

export const SYSTEM_ORDER: SystemId[] = ["gb", "gba", "ps2"];

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

export function systemForFile(fileName: string): SystemId | null {
  const ext = extensionOf(fileName);
  return SYSTEM_ORDER.find((id) => SYSTEMS[id].extensions.includes(ext)) ?? null;
}

export function titleFromFile(fileName: string): string {
  const ext = extensionOf(fileName);
  return (ext ? fileName.slice(0, -ext.length) : fileName).trim();
}

/** "Golden Sun (USA, Europe) [!]" -> "Golden Sun" for display. */
export function displayTitle(fileName: string): string {
  return titleFromFile(fileName).replace(/\s*[([][^)\]]*[)\]]/g, "").trim() || titleFromFile(fileName);
}

/** Box art from the libretro-thumbnails project. Only matches No-Intro/Redump file names. */
export function boxArtUrl(system: SystemId, fileName: string): string {
  const repo =
    system === "ps2"
      ? "Sony_-_PlayStation_2"
      : system === "gba"
        ? "Nintendo_-_Game_Boy_Advance"
        : extensionOf(fileName) === ".gbc"
          ? "Nintendo_-_Game_Boy_Color"
          : "Nintendo_-_Game_Boy";
  const name = titleFromFile(fileName).replace(/[&*/:`<>?\\|"]/g, "_");
  return `https://raw.githubusercontent.com/libretro-thumbnails/${repo}/master/Named_Boxarts/${encodeURIComponent(name)}.png`;
}
