"use client";

import Link from "next/link";
import { padName, useGamepads } from "@/hooks/useGamepads";

export default function PlayTips() {
  const pads = useGamepads();
  return (
    <div className="mx-auto mt-6 grid max-w-4xl gap-6 text-sm text-muted sm:grid-cols-2">
      <p>
        {pads.length > 0 ? (
          <>
            <span className="font-semibold text-ink">{padName(pads[0].id)}</span> is connected. If it doesn’t respond,
            click the game once, then press any button.
          </>
        ) : (
          <>
            No controller yet. Pair it in your device’s Bluetooth settings, then press any button.{" "}
            <Link href="/controller" className="underline underline-offset-2">
              Test your controller
            </Link>
          </>
        )}
      </p>
      <p>
        Remap buttons, save states and go full screen from the bar at the bottom of the game. In-game saves are kept in
        this browser.
      </p>
    </div>
  );
}
