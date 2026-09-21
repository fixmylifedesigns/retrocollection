import manifest from "@/data/library.json";
import { SYSTEMS, SYSTEM_ORDER, SystemId, displayTitle, extensionOf, regionOf, titleFromFile } from "@/lib/systems";
import { fetchDriveFile, listDriveFolder } from "@/lib/storage/drive";
import { listS3, s3DownloadUrl, s3Prefix } from "@/lib/storage/s3";

export type Provider = "drive" | "s3" | "none";

export interface Game {
  id: string;
  title: string;
  system: SystemId;
  fileName: string;
  size?: number;
  /** "Japan", "USA, Europe"… from No-Intro/Redump tags in the file name. */
  region?: string;
  /** Your own cover image, when one sits next to the ROM with the same name. */
  art?: string;
  source: "drive" | "s3" | "manifest";
}

/** Entries in src/data/library.json — for ROMs hosted at any URL (or in public/roms). */
interface ManifestEntry {
  id: string;
  title?: string;
  system: SystemId;
  fileName: string;
  url: string;
}

const manifestEntries = manifest as ManifestEntry[];

/** Accepts the system's own extensions plus zip archives (EmulatorJS unpacks them). */
function isRomFor(system: SystemId, fileName: string): boolean {
  const ext = extensionOf(fileName);
  return SYSTEMS[system].extensions.includes(ext) || (system !== "ps2" && ext === ".zip");
}

export function activeProvider(): Provider {
  const p = process.env.STORAGE_PROVIDER;
  return p === "drive" || p === "s3" ? p : "none";
}

function driveFolders(): Partial<Record<SystemId, string>> {
  return {
    gb: process.env.GOOGLE_DRIVE_FOLDER_GB || undefined,
    gba: process.env.GOOGLE_DRIVE_FOLDER_GBA || undefined,
    ps2: process.env.GOOGLE_DRIVE_FOLDER_PS2 || undefined,
  };
}

async function driveGames(): Promise<Game[]> {
  const folders = driveFolders();
  const lists = await Promise.all(
    SYSTEM_ORDER.map(async (system) => {
      const folder = folders[system];
      if (!folder) return [];
      const all = await listDriveFolder(folder);
      // "Pocket Monsters - Aka (Japan).png" next to "Pocket Monsters - Aka (Japan).gb" becomes its cover.
      const covers = new Map(
        all.filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name)).map((f) => [titleFromFile(f.name).toLowerCase(), f.id]),
      );
      const files = all.filter((f) => isRomFor(system, f.name));
      return files.map<Game>((f) => {
        const cover = covers.get(titleFromFile(f.name).toLowerCase());
        return {
          id: `drive-${f.id}`,
          title: displayTitle(f.name),
          system,
          fileName: f.name,
          size: f.size ? Number(f.size) : undefined,
          region: regionOf(f.name),
          art: cover ? `https://drive.google.com/thumbnail?id=${cover}&sz=w600` : undefined,
          source: "drive",
        };
      });
    }),
  );
  return lists.flat();
}

async function s3Games(): Promise<Game[]> {
  const prefix = s3Prefix();
  const lists = await Promise.all(
    SYSTEM_ORDER.map(async (system) => {
      const objects = (await listS3(`${prefix}${system}/`)).filter((o) => isRomFor(system, o.key));
      return objects.map<Game>((o) => {
        const fileName = o.key.slice(o.key.lastIndexOf("/") + 1);
        return {
          id: `s3-${Buffer.from(o.key).toString("base64url")}`,
          title: displayTitle(fileName),
          system,
          fileName,
          size: o.size,
          region: regionOf(fileName),
          source: "s3",
        };
      });
    }),
  );
  return lists.flat();
}

export async function getLibrary(): Promise<{ games: Game[]; provider: Provider; error?: string }> {
  const provider = activeProvider();
  const games: Game[] = manifestEntries.map((m) => ({
    id: `m-${m.id}`,
    title: m.title ?? displayTitle(m.fileName),
    system: m.system,
    fileName: m.fileName,
    region: regionOf(m.fileName),
    source: "manifest",
  }));
  let error: string | undefined;
  try {
    if (provider === "drive") games.push(...(await driveGames()));
    if (provider === "s3") games.push(...(await s3Games()));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  games.sort((a, b) => a.title.localeCompare(b.title));
  return { games, provider, error };
}

export async function getGame(id: string): Promise<Game | null> {
  const { games } = await getLibrary();
  return games.find((g) => g.id === id) ?? null;
}

/**
 * Turns a game id into something the browser can download. Ids are checked
 * against the configured folders/prefix so the route can't be used to fetch
 * arbitrary files.
 */
export async function openRom(
  id: string,
  range: string | null,
): Promise<{ redirect: string } | { stream: Response } | null> {
  if (id.startsWith("m-")) {
    const entry = manifestEntries.find((m) => `m-${m.id}` === id);
    return entry ? { redirect: entry.url } : null;
  }
  if (id.startsWith("s3-") && activeProvider() === "s3") {
    const key = Buffer.from(id.slice(3), "base64url").toString();
    if (!key.startsWith(s3Prefix()) || key.includes("..")) return null;
    return { redirect: await s3DownloadUrl(key) };
  }
  if (id.startsWith("drive-") && activeProvider() === "drive") {
    const fileId = id.slice(6);
    // Only serve files that are in one of your folders. (Drive hides a file's
    // `parents` from API-key requests, so check the folder listings instead.)
    const folders = Object.values(driveFolders()).filter((f): f is string => Boolean(f));
    const listings = await Promise.all(folders.map((folder) => listDriveFolder(folder)));
    if (!listings.some((files) => files.some((f) => f.id === fileId))) return null;
    return { stream: await fetchDriveFile(fileId, range) };
  }
  return null;
}

export function formatSize(bytes?: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}
