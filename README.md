# Retro Collection

A web app for playing your own Game Boy, Game Boy Advance and PS2 collection, with Bluetooth controller support. Built with Next.js (App Router, `src/` directory), React 19 and Tailwind CSS 4.

## What works today

| System | Engine | In the browser |
| --- | --- | --- |
| Game Boy / Game Boy Color | Gambatte via [EmulatorJS](https://emulatorjs.org) | Yes |
| Game Boy Advance | mGBA via EmulatorJS | Yes |
| PlayStation 2 | PCSX2 (planned) | No: listed in the library, plays in the future desktop app |

PS2 emulation needs far more CPU and GPU access than a browser tab provides, and no production-ready WebAssembly PS2 core exists. The library already reads your PS2 folder so the games are there when the Electron build lands.

**Controllers.** Pair a controller with your device over Bluetooth like any other accessory. Browsers expose it through the Gamepad API (not Web Bluetooth), so it works in Chrome, Edge, Firefox and Safari. Use `/controller` to test buttons, sticks and rumble. Browsers only reveal a controller after its first button press.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With no storage connected you can still play any ROM from your device at `/play/local`; the file never leaves the browser.

## Pages

- `/` Library shelf, grouped by system, with box art from libretro-thumbnails when your file names follow No-Intro/Redump naming
- `/emulators` What each system runs on and its status
- `/controller` Live controller tester and pairing help
- `/play/[id]` Plays a game from your library
- `/play/local` Plays a file from your device

## Connecting your ROM storage

Set `STORAGE_PROVIDER` in `.env.local` (or in Vercel's environment variables).

### Option A: Google Drive (`STORAGE_PROVIDER=drive`)

1. Create folders in Drive, one per system (for example `Retro/GB`, `Retro/GBA`, `Retro/PS2`).
2. Share each folder as **Anyone with the link can view**.
3. In Google Cloud Console, create a project, enable the **Google Drive API**, and create an **API key** (restrict it to the Drive API).
4. Put the key and each folder ID (the last part of the folder URL) into `GOOGLE_DRIVE_API_KEY` and `GOOGLE_DRIVE_FOLDER_GB` / `_GBA` / `_PS2`.

Drive files are streamed through `/api/rom/[id]` because Drive doesn't send CORS headers. That's fine for GB and GBA ROMs (a few MB each). Drive also rate-limits heavy public downloads, which is one more reason large PS2 images belong in a bucket.

### Option B: S3-compatible bucket (`STORAGE_PROVIDER=s3`)

Works with Cloudflare R2, Backblaze B2 and Wasabi. Lay the bucket out like this:

```
roms/gb/Tetris (World) (Rev 1).gb
roms/gba/Golden Sun (USA, Europe).gba
roms/ps2/...
```

Set `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (use a read-only key). The browser downloads each ROM straight from the bucket with a one-hour signed link, so **the bucket needs a CORS rule** for your site:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-site.vercel.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

(R2: bucket, Settings, CORS policy. B2: set it with the `b2` CLI, since the S3-compatible API needs a custom rule rather than the web UI's presets.)

### Option C: A manifest

Add entries to `src/data/library.json` for ROMs hosted at any URL, or drop files into `public/roms/` for local development (that folder is git-ignored):

```json
[{ "id": "my-homebrew", "system": "gba", "fileName": "My Homebrew.gba", "url": "/roms/My Homebrew.gba" }]
```

## Storage cost for ~1 TB (September 2026)

| Option | Approx. monthly cost for 1 TB | Downloads | Notes |
| --- | --- | --- | --- |
| Backblaze B2 | ~$7 | Free up to 3x what you store each month | Cheapest bucket; no minimums |
| Wasabi | ~$8 | Free within fair use | Billed for 1 TB minimum and 90 days per file |
| Cloudflare R2 | ~$15 | Always free | 10 GB free tier; best if you share the site widely |
| Google Drive (Google One) | ~$10 for a 2 TB plan | Rate-limited | Easiest to start, not built for serving files |

A practical split: GB and GBA libraries are small (even a large collection is a few GB), so they fit in R2's free 10 GB. Put the PS2 images, which make up nearly all of the terabyte, in Backblaze B2. Check each provider's pricing page before committing, as rates change.

## Security note

There's no login yet, so anyone with the site URL can play from your library. Until auth is added, keep the deployment private (for example with Vercel's deployment protection) and only use dumps of games you own.

## Roadmap

- **Login**: Auth.js (Google/GitHub OAuth) or Firebase Auth, gating `/api/rom` and the library
- **Desktop**: Electron shell that reuses this UI and launches PCSX2 for PS2 games
- **Android**: Capacitor wrapper around the same UI
- **Cloud saves**: sync EmulatorJS save files to the bucket per user

## Project layout

```
src/
  app/                 routes (library, emulators, controller, play, api)
  components/          shelf cards, emulator frame, controller tester
  hooks/useGamepads.ts Gamepad API hook
  lib/systems.ts       per-system config (core, extensions, status)
  lib/library.ts       merges manifest + storage provider listings
  lib/storage/         Google Drive and S3-compatible adapters
public/emulator/       isolated EmulatorJS host page (loaded in an iframe)
```
