"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import GameCard from "@/components/GameCard";
import ShelfRail from "@/components/ShelfRail";
import type { Game } from "@/lib/library";
import { playTarget } from "@/lib/systems";

// three.js only runs in the browser, and only loads once a rail is near the screen.
const RailStage = dynamic(() => import("@/components/three/GameStage"), { ssr: false });

const LAUNCH_MS = 600; // matches the drop animation on the stage
const PER_VIEW = 3;
// Model area above each title; the canvas behind the rail is the same height.
const STAGE_HEIGHT = "h-[200px] sm:h-[260px]";

/**
 * One system's rail: 3D cartridges or cases, three at a time, scrolled like any
 * list. Hover or focus one to turn it towards you; click to play it.
 */
export default function SystemShowcase({ games, label }: { games: Game[]; label: string }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLElement | null)[]>([]);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [nearScreen, setNearScreen] = useState(false);
  const [range, setRange] = useState<[number, number]>([0, PER_VIEW]);
  const [overflows, setOverflows] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const probe = document.createElement("canvas");
    setWebgl(Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl")));
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Mount the WebGL canvas only while the rail is near the viewport.
    const observer = new IntersectionObserver(([entry]) => setNearScreen(entry.isIntersecting), {
      rootMargin: "300px 0px",
    });
    if (wrap.current) observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);

  // Track which games are in (or next to) the visible part of the rail, so only
  // those get a 3D model.
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        const slotWidth = box.width / PER_VIEW;
        let first = -1;
        let last = -1;
        slots.current.forEach((slot, i) => {
          if (!slot) return;
          const r = slot.getBoundingClientRect();
          if (r.right >= box.left - slotWidth && r.left <= box.right + slotWidth) {
            if (first < 0) first = i;
            last = i;
          }
        });
        if (first >= 0) setRange((prev) => (prev[0] === first && prev[1] === last ? prev : [first, last]));
        setOverflows(el.scrollWidth > el.clientWidth + 4);
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [webgl]);

  function launch(game: Game) {
    const { href, fullLoad } = playTarget(game);
    const go = () => (fullLoad ? window.location.assign(href) : router.push(href));
    if (reducedMotion || !webgl) return go();
    setLaunchingId(game.id);
    window.setTimeout(go, LAUNCH_MS);
  }

  function scrollBy(direction: number) {
    const el = rail.current;
    if (el) el.scrollBy({ left: (el.clientWidth / PER_VIEW) * direction, behavior: "smooth" });
  }

  // No WebGL on this device: fall back to the flat cartridge cards.
  if (webgl === false) {
    return (
      <ShelfRail label={label}>
        {games.map((game) => (
          <div role="listitem" key={game.id}>
            <GameCard game={game} />
          </div>
        ))}
      </ShelfRail>
    );
  }

  return (
    <div ref={wrap} className="relative mt-8">
      {nearScreen && webgl && (
        <div className={`pointer-events-none absolute inset-x-0 top-0 ${STAGE_HEIGHT}`}>
          <RailStage
            games={games}
            slots={slots}
            range={range}
            hovered={hovered}
            launchingId={launchingId}
            still={reducedMotion}
          />
        </div>
      )}

      <div
        ref={rail}
        role="list"
        aria-label={label}
        className={`relative flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          games.length < PER_VIEW ? "justify-center" : ""
        }`}
      >
        {games.map((game, i) => {
          const { href } = playTarget(game);
          return (
            <div role="listitem" key={game.id} className="w-1/3 shrink-0 snap-start">
              <a
                ref={(el) => {
                  slots.current[i] = el;
                }}
                href={href}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  launch(game);
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered((h) => (h === i ? null : h))}
                aria-label={`Play ${game.title}`}
                className="block rounded-2xl px-2 pb-3"
              >
                <div aria-hidden className={STAGE_HEIGHT} />
                <p className="caption mx-auto font-medium">{game.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {[game.region, game.system === "ps2" ? "experimental" : null].filter(Boolean).join(", ") || "\u00a0"}
                </p>
              </a>
            </div>
          );
        })}
      </div>

      {overflows && (
        <div className="mt-4 flex justify-center gap-3">
          <Arrow label={`Previous in ${label}`} onClick={() => scrollBy(-1)} flip />
          <Arrow label={`Next in ${label}`} onClick={() => scrollBy(1)} />
        </div>
      )}
    </div>
  );
}

function Arrow({ label, onClick, flip = false }: { label: string; onClick: () => void; flip?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border border-line transition-colors hover:bg-plastic"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden style={flip ? { transform: "scaleX(-1)" } : undefined}>
        <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
