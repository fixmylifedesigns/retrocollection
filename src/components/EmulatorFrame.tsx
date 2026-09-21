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

  const aspect = system === "gba" ? "aspect-[3/2]" : "aspect-[10/9]";

  return (
    <div className={`mx-auto w-full max-w-4xl overflow-hidden rounded-xl bg-black ${aspect} shadow-[0_24px_48px_-24px_rgb(28_31_46/0.6)]`}>
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
