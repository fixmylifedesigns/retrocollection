"use client";

import { useRef } from "react";
import type { SystemId } from "@/lib/systems";
import { SYSTEMS } from "@/lib/systems";

interface Props {
  system: SystemId;
  romUrl: string;
  /** Used by EmulatorJS to key save files and save states. */
  saveName: string;
}

export default function EmulatorFrame({ system, romUrl, saveName }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const def = SYSTEMS[system];
  if (!def.core) return null;

  const src = `/emulator/index.html?${new URLSearchParams({
    core: def.core,
    rom: romUrl,
    name: saveName,
    color: def.accent,
  })}`;

  // Screen shape, width / height: GB/GBC is 10:9, GBA is 3:2.
  const ratio = system === "gba" ? 3 / 2 : 10 / 9;

  return (
    <div
      className="mx-auto overflow-hidden rounded-xl bg-black shadow-[0_24px_48px_-24px_rgb(28_31_46/0.6)]"
      style={{
        aspectRatio: ratio,
        // Fit the viewport: as wide as allowed, but never taller than the
        // screen minus the header and title above it.
        width: `min(100%, 56rem, max(18rem, calc((100dvh - 16rem) * ${ratio})))`,
      }}
    >
      <iframe
        ref={frame}
        key={src}
        src={src}
        title={`${def.shortName} emulator`}
        className="size-full"
        allow="fullscreen; gamepad; autoplay"
        allowFullScreen
        // Keyboard input only reaches the game once the frame has focus.
        onLoad={() => frame.current?.focus()}
      />
    </div>
  );
}
