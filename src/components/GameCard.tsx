"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/library";
import { SYSTEMS, coverSources, playTarget } from "@/lib/systems";

const SHAPE = { gb: "cart-gb", gba: "cart-gba", ps2: "case-ps2" } as const;
const LAUNCH_MS = 520; // matches the insert animation in globals.css

interface Props {
  game: Game;
  /** Highlight this card (it's the one on the 3D stage). */
  active?: boolean;
  /** Parent-driven launch state, when the parent handles launching. */
  launching?: boolean;
  onActivate?: () => void;
  /** When set, the parent plays the launch animation and navigates. */
  onLaunch?: (game: Game) => void;
}

export default function GameCard({ game, active, launching: launchingProp, onActivate, onLaunch }: Props) {
  const system = SYSTEMS[game.system];
  // Your own cover first, then libretro-thumbnails, then a printed label.
  const sources = coverSources(game);
  const [artIndex, setArtIndex] = useState(0);
  const art = artIndex < sources.length;
  const nextArt = () => setArtIndex((i) => i + 1);
  const img = useRef<HTMLImageElement>(null);
  const [launching, setLaunching] = useState(false);
  const router = useRouter();

  // Play the insert animation, then open the game. New-tab clicks and
  // reduced-motion users go straight through.
  function launch(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (onLaunch) {
      e.preventDefault();
      onLaunch(game);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    setLaunching(true);
    const { href, fullLoad } = playTarget(game);
    window.setTimeout(() => (fullLoad ? window.location.assign(href) : router.push(href)), LAUNCH_MS);
  }

  // A 404 that lands before hydration never reaches onError, so check once on mount.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) nextArt();
  }, [artIndex]);

  const media = (
    <div className={`media ${SHAPE[game.system]}`} style={{ ["--accent" as string]: system.accent }}>
      <div className={`label ${art ? "has-art" : ""}`}>
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={sources[artIndex]} ref={img} src={sources[artIndex]} alt="" loading="lazy" onError={nextArt} />
        ) : (
          <span>{game.title}</span>
        )}
      </div>
    </div>
  );

  const width = game.system === "gba" ? "w-[164px]" : game.system === "gb" ? "w-[124px]" : "w-[118px]";

  const itemClass = `item ${width} ${launching || launchingProp ? "launching" : ""} ${active ? "active" : ""}`;
  const { href } = playTarget(game);
  const activate = { onMouseEnter: onActivate, onFocus: onActivate };

  if (system.status === "experimental") {
    return (
      <a href={href} onClick={launch} className={itemClass} {...activate}>
        {media}
        <div>
          <p className="caption font-medium">{game.title}</p>
          <p className="text-xs text-muted">{game.region ? `${game.region}, experimental` : "Experimental"}</p>
        </div>
      </a>
    );
  }

  return (
    <Link href={href} onClick={launch} className={itemClass} {...activate}>
      {media}
      <div>
        <p className="caption font-medium">{game.title}</p>
        {game.region && <p className="text-xs text-muted">{game.region}</p>}
      </div>
    </Link>
  );
}
