"use client";

import Link from "next/link";
import { padName, useGamepads } from "@/hooks/useGamepads";

export default function ControllerPill() {
  const pads = useGamepads();
  const connected = pads.length > 0;
  return (
    <Link
      href="/controller"
      className="flex items-center gap-2 rounded-full border border-line bg-white/60 px-3 py-1.5 text-sm"
      title={connected ? pads.map((p) => padName(p.id)).join(", ") : "No controller detected"}
    >
      <span
        aria-hidden
        className={`size-2.5 rounded-full ${connected ? "bg-gb-screen shadow-[0_0_0_3px_rgb(155_188_15/0.25)]" : "bg-line"}`}
      />
      <span className="max-w-[14rem] truncate">
        {connected
          ? pads.length === 1
            ? padName(pads[0].id)
            : `${pads.length} controllers`
          : "No controller"}
      </span>
    </Link>
  );
}
