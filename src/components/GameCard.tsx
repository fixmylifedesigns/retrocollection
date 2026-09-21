"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/library";
import { SYSTEMS, boxArtUrl, ps2PlayerUrl } from "@/lib/systems";

const SHAPE = { gb: "cart-gb", gba: "cart-gba", ps2: "case-ps2" } as const;

export default function GameCard({ game }: { game: Game }) {
  const system = SYSTEMS[game.system];
  const [art, setArt] = useState(true);
  const img = useRef<HTMLImageElement>(null);

  // A 404 that lands before hydration never reaches onError, so check once on mount.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setArt(false);
  }, []);

  const media = (
    <div className={`media ${SHAPE[game.system]}`} style={{ ["--accent" as string]: system.accent }}>
      <div className={`label ${art ? "has-art" : ""}`}>
        {art ? (
          // Box art comes from libretro-thumbnails; falls back to a printed label.
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={img} src={boxArtUrl(game.system, game.fileName)} alt="" loading="lazy" onError={() => setArt(false)} />
        ) : (
          <span>{game.title}</span>
        )}
      </div>
    </div>
  );

  const width = game.system === "gba" ? "w-[164px]" : game.system === "gb" ? "w-[124px]" : "w-[118px]";

  if (system.status === "experimental") {
    return (
      <a href={ps2PlayerUrl(game)} className={`item ${width}`}>
        {media}
        <div>
          <p className="caption font-medium">{game.title}</p>
          <p className="text-xs text-muted">Experimental</p>
        </div>
      </a>
    );
  }

  return (
    <Link href={`/play/${encodeURIComponent(game.id)}`} className={`item ${width}`}>
      {media}
      <p className="caption font-medium">{game.title}</p>
    </Link>
  );
}
