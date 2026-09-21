// Host for the Play! PS2 emulator (WebAssembly build in ./Play.js + ./Play.wasm).
// Mirrors js/play_browser in the Play! repo, plus: streaming disc images from the
// library over HTTP range requests, and a Gamepad API bridge (the web build of
// Play! only reads the keyboard).

const $ = (id) => document.getElementById(id);
const canvas = $("outputCanvas");
const overlay = $("overlay");
const overlayBody = $("overlayBody");
const statusEl = $("status");
const params = new URLSearchParams(location.search);

const PS2_EXTENSIONS = [".iso", ".chd", ".cso", ".isz", ".bin", ".elf"];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function showOverlay(html) {
  overlayBody.innerHTML = html;
  overlay.hidden = false;
}

// ---------------------------------------------------------------------------
// Disc image devices. Play! calls read(dstPtr, offset, size), then polls
// isDone() from its emulation thread, so reads may finish asynchronously.

class FileDevice {
  constructor(module, file) {
    this.module = module;
    this.file = file;
    this.doneFlag = true;
  }
  read(dstPtr, offset, size) {
    this.doneFlag = false;
    this.file
      .slice(offset, offset + size)
      .arrayBuffer()
      .then((buf) => {
        this.module.HEAPU8.set(new Uint8Array(buf), dstPtr >>> 0);
        this.doneFlag = true;
      });
  }
  getFileSize() {
    return this.file.size;
  }
  isDone() {
    return this.doneFlag;
  }
}

// Streams a disc image from /api/rom/<id> in 1 MiB blocks with a small cache,
// so a 4 GB image never has to be downloaded up front.
class UrlDevice {
  static BLOCK = 1024 * 1024;
  static MAX_BLOCKS = 64;

  constructor(module, romPath, size) {
    this.module = module;
    this.romPath = romPath;
    this.size = size || 0;
    this.url = romPath;
    this.cache = new Map();
    this.inflight = new Map();
    this.doneFlag = true;
    this.onError = () => {};
  }

  // Follows the redirect once (to the bucket's signed URL) and learns the size.
  async resolve() {
    const ctrl = new AbortController();
    const res = await fetch(this.romPath, { headers: { range: "bytes=0-0" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`The server answered ${res.status} for this game.`);
    this.url = res.url;
    if (!this.size) {
      const total = res.headers.get("content-range")?.split("/")[1];
      this.size = Number(total) || (res.status === 200 ? Number(res.headers.get("content-length")) : 0);
    }
    ctrl.abort();
    if (!this.size) throw new Error("Couldn’t tell how big this disc image is. Check the bucket CORS rule exposes Content-Range.");
  }

  async fetchBlock(index, retry = true) {
    const start = index * UrlDevice.BLOCK;
    const end = Math.min(start + UrlDevice.BLOCK, this.size) - 1;
    const res = await fetch(this.url, { headers: { range: `bytes=${start}-${end}` } });
    if ((res.status === 403 || res.status === 400) && retry) {
      await this.resolve(); // signed link expired
      return this.fetchBlock(index, false);
    }
    if (res.status !== 206 && !(res.status === 200 && start === 0 && end === this.size - 1)) {
      throw new Error(`Range request failed (${res.status}). The storage must support byte ranges.`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  block(index) {
    if (this.cache.has(index)) {
      const hit = this.cache.get(index);
      this.cache.delete(index);
      this.cache.set(index, hit); // keep recently used blocks at the end
      return Promise.resolve(hit);
    }
    if (!this.inflight.has(index)) {
      const p = this.fetchBlock(index)
        .then((data) => {
          this.cache.set(index, data);
          while (this.cache.size > UrlDevice.MAX_BLOCKS) this.cache.delete(this.cache.keys().next().value);
          return data;
        })
        .finally(() => this.inflight.delete(index));
      this.inflight.set(index, p);
    }
    return this.inflight.get(index);
  }

  read(dstPtr, offset, size) {
    this.doneFlag = false;
    const first = Math.floor(offset / UrlDevice.BLOCK);
    const last = Math.floor((offset + size - 1) / UrlDevice.BLOCK);
    const wanted = [];
    for (let i = first; i <= last; i++) wanted.push(this.block(i));
    const next = last + 1;
    if (next * UrlDevice.BLOCK < this.size) this.block(next).catch(() => {}); // read ahead

    Promise.all(wanted)
      .then((blocks) => {
        const heap = this.module.HEAPU8;
        let dst = dstPtr >>> 0;
        let pos = offset;
        let remaining = size;
        blocks.forEach((data, i) => {
          const blockStart = (first + i) * UrlDevice.BLOCK;
          const from = pos - blockStart;
          const count = Math.min(remaining, data.length - from);
          heap.set(data.subarray(from, from + count), dst);
          dst += count;
          pos += count;
          remaining -= count;
        });
        this.doneFlag = true;
      })
      .catch((err) => {
        this.onError(err);
        this.doneFlag = true; // let the emulator continue rather than hang forever
      });
  }
  getFileSize() {
    return this.size;
  }
  isDone() {
    return this.doneFlag;
  }
}

// ---------------------------------------------------------------------------
// Gamepad -> keyboard bridge. Play!'s web build binds these KeyboardEvent codes
// (see Source/ui_js/Main.cpp). Note it expects "Key1" rather than the browser's
// "Digit1", so we also translate the physical number keys.

const BUTTON_KEYS = {
  0: "KeyZ", 1: "KeyX", 2: "KeyA", 3: "KeyS", // cross, circle, square, triangle
  4: "Key1", 5: "Key8", 6: "Key2", 7: "Key9", // L1, R1, L2, R2
  8: "Backspace", 9: "Enter", 10: "Key3", 11: "Key0", // select, start, L3, R3
  12: "ArrowUp", 13: "ArrowDown", 14: "ArrowLeft", 15: "ArrowRight",
};
const AXIS_KEYS = [
  ["KeyF", "KeyH"], // left stick X: negative, positive
  ["KeyT", "KeyG"], // left stick Y
  ["KeyJ", "KeyL"], // right stick X
  ["KeyI", "KeyK"], // right stick Y
];
const DIGIT_TO_PLAY = { Digit0: "Key0", Digit1: "Key1", Digit2: "Key2", Digit3: "Key3", Digit8: "Key8", Digit9: "Key9" };

// Keys held by the controller and by the keyboard are tracked separately so one
// doesn't release a key the other is still holding.
const padHeld = new Set();
const keyHeld = new Set();
const sent = new Set();
function sync(code) {
  const down = padHeld.has(code) || keyHeld.has(code);
  if (down === sent.has(code)) return;
  down ? sent.add(code) : sent.delete(code);
  canvas.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
}
function setPadKey(code, down) {
  down ? padHeld.add(code) : padHeld.delete(code);
  sync(code);
}

canvas.addEventListener(
  "keydown",
  (e) => {
    const code = DIGIT_TO_PLAY[e.code];
    if (e.isTrusted && code && !e.repeat) {
      keyHeld.add(code);
      sync(code);
    }
  },
  true,
);
canvas.addEventListener(
  "keyup",
  (e) => {
    const code = DIGIT_TO_PLAY[e.code];
    if (e.isTrusted && code) {
      keyHeld.delete(code);
      sync(code);
    }
  },
  true,
);

function padLabel(id) {
  return id.replace(/\s*\(.*?Vendor:.*?\)\s*/i, "").trim() || "Controller";
}

function pollPads() {
  const pad = Array.from(navigator.getGamepads?.() ?? []).find(Boolean);
  $("padDot").classList.toggle("on", Boolean(pad));
  $("padName").textContent = pad ? padLabel(pad.id) : "No controller";
  if (pad && pad.mapping === "standard") {
    for (const [index, code] of Object.entries(BUTTON_KEYS)) {
      setPadKey(code, (pad.buttons[index]?.value ?? 0) > 0.5);
    }
    AXIS_KEYS.forEach(([neg, pos], axis) => {
      const v = pad.axes[axis] ?? 0;
      setPadKey(neg, v < -0.5);
      setPadKey(pos, v > 0.5);
    });
  } else if (padHeld.size) {
    for (const code of [...padHeld]) setPadKey(code, false); // controller went away
  }
  requestAnimationFrame(pollPads);
}
requestAnimationFrame(pollPads);

// ---------------------------------------------------------------------------
// Boot

let Module = null;
let booted = false;

// Play! needs SharedArrayBuffer, which browsers only allow on cross-origin
// isolated pages. Work out which of the requirements is missing.
async function isolationProblem() {
  if (!self.isSecureContext) {
    return (
      `This page was opened over plain HTTP at ${location.host}. Browsers only allow the emulator’s threads on HTTPS ` +
      `or on localhost. On this computer open http://localhost:${location.port || 80}${location.pathname}, use your ` +
      `deployed https:// site, or run “npm run dev:https” to test from another device on your network.`
    );
  }
  if (self !== self.top) {
    return "This page is inside another page’s frame, which blocks isolation. Open it in its own tab.";
  }
  try {
    const res = await fetch(location.href, { method: "HEAD", cache: "no-store" });
    const coop = res.headers.get("cross-origin-opener-policy");
    const coep = res.headers.get("cross-origin-embedder-policy");
    if (coop !== "same-origin" || coep !== "require-corp") {
      return (
        `The server didn’t send the isolation headers for this page (Cross-Origin-Opener-Policy: ${coop ?? "missing"}, ` +
        `Cross-Origin-Embedder-Policy: ${coep ?? "missing"}). Check the latest next.config.ts is deployed and that ` +
        `nothing in front of the site (a proxy or CDN) strips these headers.`
      );
    }
  } catch {
    // Fall through to the generic hint.
  }
  return "The headers arrive but the browser still didn’t isolate the page. Do a full reload, and use a current Chrome, Edge, Firefox or Safari.";
}

async function loadEngine() {
  if (!self.crossOriginIsolated) {
    throw new Error(await isolationProblem());
  }
  let Play;
  try {
    Play = (await import("./Play.js")).default;
  } catch {
    const err = new Error("missing-engine");
    throw err;
  }
  const base = new URL(".", location.href).href;
  Module = await Play({
    locateFile: (path) => base + path,
    mainScriptUrlOrBlob: base + "Play.js",
  });
  Module.FS.mkdir("/work");
  Module.discImageDevice = null;
  Module.ccall("initVm", "", [], []);
  setInterval(() => {
    if (!booted) return;
    $("fps").textContent = `${Module.getFrames()} frames/s`;
    Module.clearStats();
  }, 1000);
}

function boot(device, fileName) {
  Module.discImageDevice = device;
  if (fileName.toLowerCase().endsWith(".elf")) {
    throw new Error("ELF files aren’t supported here. Use a disc image.");
  }
  Module.bootDiscImage(fileName);
  booted = true;
  overlay.hidden = true;
  canvas.focus();
  statusEl.textContent = fileName;
}

function pickerHtml() {
  return `
    <label class="drop" id="drop">
      <strong>Drop a PS2 disc image here or choose a file</strong>
      <p>.iso, .chd, .cso or .bin. It stays on your device.</p>
      <input class="sr-only" type="file" id="file" accept="${PS2_EXTENSIONS.join(",")}" />
    </label>`;
}

function wirePicker() {
  const drop = $("drop");
  const input = $("file");
  const start = (file) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!PS2_EXTENSIONS.includes(ext) || ext === ".elf") {
      showOverlay(`<div><strong>${esc(file.name)} isn’t a PS2 disc image</strong><p>Choose an .iso, .chd, .cso or .bin file.</p>${pickerHtml()}</div>`);
      wirePicker();
      return;
    }
    $("title").innerHTML = `${esc(file.name.replace(/\.[^.]+$/, "").replace(/\s*[([][^)\]]*[)\]]/g, ""))} <span class="tag">Experimental</span>`;
    boot(new FileDevice(Module, file), file.name);
  };
  input.addEventListener("change", () => start(input.files?.[0]));
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("drag");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
    start(e.dataTransfer.files[0]);
  });
}

function showLibraryGame() {
  const id = params.get("game");
  const fileName = params.get("file") || "disc.iso";
  const title = params.get("title") || fileName;
  document.title = `${title} · Retro Collection`;
  $("title").innerHTML = `${esc(title)} <span class="tag">Experimental</span>`;
  showOverlay(`
    <div>
      <strong>${esc(title)}</strong>
      <p>Streams from your library as it plays. The first boot takes a moment.</p>
      <p><button class="btn" id="start" type="button">Start game</button></p>
    </div>`);
  // A click is needed anyway so the browser lets the game play sound.
  $("start").addEventListener("click", async () => {
    showOverlay(`<div><strong>Connecting to your library…</strong></div>`);
    try {
      const device = new UrlDevice(Module, `/api/rom/${encodeURIComponent(id)}`, Number(params.get("size")) || 0);
      device.onError = (err) => {
        statusEl.textContent = `Read error: ${err.message}`;
      };
      await device.resolve();
      boot(device, fileName);
    } catch (err) {
      showOverlay(`<div><strong>Couldn’t start this game</strong><p>${esc(err.message)}</p></div>`);
    }
  });
}

// Light/dark toggle, shared with the rest of the site.
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme !== "light";
  $("theme").textContent = dark ? "Light" : "Dark";
  $("theme").setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}
$("theme").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("fixmylife-theme", next);
  } catch {}
  syncThemeButton();
});
syncThemeButton();

$("fullscreen").addEventListener("click", () => {
  document.querySelector(".stage").requestFullscreen?.();
  canvas.focus();
});
canvas.addEventListener("click", () => canvas.focus());

loadEngine()
  .then(() => {
    if (params.get("game")) {
      showLibraryGame();
    } else {
      showOverlay(pickerHtml());
      wirePicker();
    }
  })
  .catch((err) => {
    if (err.message === "missing-engine") {
      showOverlay(`
        <div>
          <strong>The PS2 engine isn’t installed yet</strong>
          <p>Run the “Build PS2 engine (Play!)” action in the GitHub repo once, then run
          <code>npm run ps2:fetch</code> locally or redeploy.</p>
          <p><a class="btn ghost" href="/">Back to your shelf</a></p>
        </div>`);
    } else {
      showOverlay(`<div><strong>The PS2 engine couldn’t start</strong><p>${esc(err.message)}</p></div>`);
    }
  });
