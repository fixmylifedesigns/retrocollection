// Copies three.js's Draco decoder into public/draco so the cartridge models
// (Draco-compressed GLBs) load without a third-party CDN. Runs before dev/build.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const from = join(process.cwd(), "node_modules", "three", "examples", "jsm", "libs", "draco", "gltf");
const to = join(process.cwd(), "public", "draco");

if (!existsSync(from)) {
  console.warn("[draco] three.js Draco decoder not found; cartridge models will fall back to simple shapes.");
} else {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log("[draco] Copied the Draco decoder into public/draco.");
}
