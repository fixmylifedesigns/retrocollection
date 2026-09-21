"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import GameCard from "@/components/GameCard";
import ShelfRail from "@/components/ShelfRail";
import type { Game } from "@/lib/library";
import { playTarget } from "@/lib/systems";

// three.js only runs in the browser, and only loads once a stage is near the screen.
const GameStage = dynamic(() => import("@/components/three/GameStage"), { ssr: false });

const LAUNCH_MS = 600; // matches the drop animation on the stage

/**
 * One system's showcase: a 3D stage showing the game you're looking at,
 * above the rail of cards. Hover, focus or scroll to a card to bring it on
 * stage; click to play it.
 */
export default function SystemShowcase({ games, label }: { games: Game[]; label: string }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(games[0]?.id);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [nearScreen, setNearScreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stageBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = stageBox.current;
    if (!el) return;
    // Mount the WebGL canvas only while it's near the viewport, so three stages
    // never compete for GPU contexts.
    const observer = new IntersectionObserver(([entry]) => setNearScreen(entry.isIntersecting), {
      rootMargin: "300px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const active = games.find((g) => g.id === activeId) ?? games[0];

  function launch(game: Game) {
    const { href, fullLoad } = playTarget(game);
    const go = () => (fullLoad ? window.location.assign(href) : router.push(href));
    if (reducedMotion) return go();
    setActiveId(game.id);
    setLaunchingId(game.id);
    window.setTimeout(go, LAUNCH_MS);
  }

  return (
    <div>
      <div ref={stageBox} className="relative mx-auto mt-6 h-[300px] max-w-3xl sm:h-[380px]">
        {nearScreen && active && (
          <GameStage game={active} launching={launchingId === active.id} still={reducedMotion} />
        )}
      </div>
      {active && (
        <div className="mt-2">
          <p className="text-lg font-light">{active.title}</p>
          <p className="mt-1 text-sm text-muted">{active.region ?? "\u00a0"}</p>
          <button
            type="button"
            onClick={() => launch(active)}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper transition-opacity hover:opacity-85"
          >
            Play
          </button>
        </div>
      )}
      <ShelfRail label={label} onCentered={(i) => games[i] && setActiveId(games[i].id)}>
        {games.map((game) => (
          <div role="listitem" key={game.id}>
            <GameCard
              game={game}
              active={game.id === active?.id}
              launching={launchingId === game.id}
              onActivate={() => setActiveId(game.id)}
              onLaunch={launch}
            />
          </div>
        ))}
      </ShelfRail>
    </div>
  );
}
