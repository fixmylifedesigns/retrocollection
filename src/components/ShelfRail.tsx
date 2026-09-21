"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Horizontal, snap-scrolling rail of games. Arrows appear only when the rail
 * overflows. Later this is where 3D renders of each game can take over.
 */
export default function ShelfRail({ children, label }: { children: React.ReactNode; label: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollWidth > el.clientWidth + 4);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function scrollBy(direction: number) {
    const el = rail.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: ((card?.offsetWidth ?? 160) + 40) * direction, behavior: "smooth" });
  }

  return (
    <div>
      <div ref={rail} className="shelf" role="list" aria-label={label}>
        {children}
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
