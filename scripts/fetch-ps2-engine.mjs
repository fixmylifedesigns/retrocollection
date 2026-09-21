// Downloads the Play! WebAssembly build (made by .github/workflows/build-ps2-engine.yml)
// into public/ps2/. Runs before `dev` and `build`; never fails the build.
// Usage: node scripts/fetch-ps2-engine.mjs [--force]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE =
  process.env.PS2_ENGINE_URL ||
  "https://github.com/fixmylifedesigns/retrocollection/releases/download/play-wasm";
const DEST = join(process.cwd(), "public", "ps2");
const FILES = ["Play.js", "Play.wasm", "VERSION"];
const force = process.argv.includes("--force");

if (!force && FILES.every((f) => existsSync(join(DEST, f)))) {
  console.log("[ps2] Engine already present in public/ps2 (use --force to refresh).");
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });
try {
  for (const file of FILES) {
    const res = await fetch(`${BASE}/${file}`);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    writeFileSync(join(DEST, file), Buffer.from(await res.arrayBuffer()));
  }
  console.log("[ps2] Downloaded Play! engine into public/ps2.");
} catch (err) {
  console.warn(`[ps2] Couldn't download the PS2 engine (${err.message}).`);
  console.warn("[ps2] Run the 'Build PS2 engine (Play!)' GitHub Action once, then build again. Everything else still works.");
}
