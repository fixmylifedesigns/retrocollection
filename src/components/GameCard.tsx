"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/library";
import { SYSTEMS, boxArtUrl, ps2PlayerUrl } from "@/lib/systems";

const SHAPE = { gb: "cart-gb", gba: "cart-gba", ps2: "case-ps2" } as const;
const LAUNCH_MS = 520; // matches the insert animation in globals.css

export default function GameCard({ game }: { game: Game }) {
  const system = SYSTEMS[game.system];
  const [art, setArt] = useState(true);
  const img = useRef<HTMLImageElement>(null);
  const [launching, setLaunching] = useState(false);
  const router = useRouter();

  // Play the insert animation, then open the game. New-tab clicks and
  // reduced-motion users go straight through.
  function launch(e: React.MouseEvent<HTMLAnchorElement>, href: string, fullLoad: boolean) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    setLaunching(true);
    window.setTimeout(() => (fullLoad ? window.location.assign(href) : router.push(href)), LAUNCH_MS);
  }

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

  const itemClass = `item ${width} ${launching ? "launching" : ""}`;

  if (system.status === "experimental") {
    const href = ps2PlayerUrl(game);
    return (
      <a href={href} onClick={(e) => launch(e, href, true)} className={itemClass}>
        {media}
        <div>
          <p className="caption font-medium">{game.title}</p>
          <p className="text-xs text-muted">Experimental</p>
        </div>
      </a>
    );
  }

  return (
    <Link href={`/play/${encodeURIComponent(game.id)}`} onClick={(e) => launch(e, `/play/${encodeURIComponent(game.id)}`, false)} className={itemClass}>
      {media}
      <p className="caption font-medium">{game.title}</p>
    </Link>
  );
}
