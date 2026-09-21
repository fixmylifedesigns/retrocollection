"use client";

import { useEffect, useState } from "react";
import EmulatorFrame from "@/components/EmulatorFrame";
import PlayTips from "@/components/PlayTips";
import { SYSTEMS, SYSTEM_ORDER, SystemId, displayTitle, extensionOf, systemForFile } from "@/lib/systems";

interface Loaded {
  url: string;
  name: string;
  system: SystemId;
}

const ACCEPT = [...SYSTEMS.gb.extensions, ...SYSTEMS.gba.extensions, ".zip"].join(",");

export default function LocalPlayer() {
  const [file, setFile] = useState<File | null>(null);
  const [system, setSystem] = useState<SystemId | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => {
    if (loaded) URL.revokeObjectURL(loaded.url);
  }, [loaded]);

  function choose(f: File | undefined) {
    if (!f) return;
    const detected = systemForFile(f.name);
    setFile(f);
    setSystem(detected);
    if (detected && SYSTEMS[detected].status === "ready") start(f, detected);
  }

  function start(f: File, s: SystemId) {
    setLoaded({ url: URL.createObjectURL(f), name: displayTitle(f.name), system: s });
  }

  if (loaded) {
    return (
      <section>
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="display text-4xl font-extrabold sm:text-5xl">{loaded.name}</h1>
          <button
            type="button"
            onClick={() => {
              setLoaded(null);
              setFile(null);
            }}
            className="rounded-full border border-line px-4 py-2 text-sm hover:bg-plastic"
          >
            Choose another file
          </button>
        </div>
        <EmulatorFrame system={loaded.system} romUrl={loaded.url} saveName={loaded.name} />
        <PlayTips />
      </section>
    );
  }

  const needsSystem = file && !system && extensionOf(file.name) === ".zip";
  const unsupported = file && system && SYSTEMS[system].status !== "ready";

  return (
    <section className="max-w-2xl">
      <h1 className="display text-5xl font-extrabold sm:text-6xl">Play a file from this device</h1>
      <p className="mt-4 text-lg text-muted">
        The file stays on your device. Nothing is uploaded.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          choose(e.dataTransfer.files[0]);
        }}
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragging ? "border-gba bg-gba/5" : "border-line bg-white/50 hover:border-muted"
        }`}
      >
        <span className="text-lg font-semibold">Drop a ROM here or choose a file</span>
        <span className="text-sm text-muted">.gb, .gbc, .gba or .zip</span>
        <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
      </label>

      {needsSystem && (
        <div className="mt-6">
          <p className="font-medium">Which system is {file.name} for?</p>
          <div className="mt-3 flex gap-2">
            {SYSTEM_ORDER.filter((id) => SYSTEMS[id].status === "ready").map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => start(file, id)}
                className="rounded-full px-4 py-2 text-sm font-medium text-white"
                style={{ background: SYSTEMS[id].accent }}
              >
                {SYSTEMS[id].shortName}
              </button>
            ))}
          </div>
        </div>
      )}

      {file && !system && !needsSystem && (
        <p className="mt-6 text-muted">
          {file.name} isn’t a Game Boy or GBA file. Choose a .gb, .gbc, .gba or .zip file.
        </p>
      )}

      {unsupported && <p className="mt-6 text-muted">{SYSTEMS[system].note}</p>}
    </section>
  );
}
