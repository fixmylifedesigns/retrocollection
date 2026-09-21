"use client";

import { useEffect, useState } from "react";

export interface PadState {
  index: number;
  id: string;
  mapping: string;
  buttons: number[];
  axes: number[];
  canRumble: boolean;
}

function snapshot(): PadState[] {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return [];
  return Array.from(navigator.getGamepads())
    .filter((p): p is Gamepad => p !== null)
    .map((p) => ({
      index: p.index,
      id: p.id,
      mapping: p.mapping,
      buttons: p.buttons.map((b) => b.value),
      axes: [...p.axes],
      canRumble: Boolean(p.vibrationActuator),
    }));
}

/**
 * Controllers paired over Bluetooth (or USB) show up through the Gamepad API.
 * `live` polls every frame for input visualisers; otherwise it only updates
 * on connect/disconnect.
 */
export function useGamepads(live = false): PadState[] {
  const [pads, setPads] = useState<PadState[]>([]);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      setPads(snapshot());
      if (live) frame = requestAnimationFrame(read);
    };
    window.addEventListener("gamepadconnected", read);
    window.addEventListener("gamepaddisconnected", read);
    read();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("gamepadconnected", read);
      window.removeEventListener("gamepaddisconnected", read);
    };
  }, [live]);

  return pads;
}

export function rumble(index: number) {
  const pad = navigator.getGamepads?.()[index];
  pad?.vibrationActuator?.playEffect?.("dual-rumble", {
    duration: 400,
    strongMagnitude: 0.8,
    weakMagnitude: 0.4,
  });
}

/** Trims browser-added vendor/product noise, e.g. "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)". */
export function padName(id: string): string {
  return id.replace(/\s*\(.*?Vendor:.*?\)\s*/i, "").replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, "").trim() || "Controller";
}
