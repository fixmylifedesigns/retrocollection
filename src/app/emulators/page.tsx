import type { Metadata } from "next";
import Link from "next/link";
import { SYSTEMS, SYSTEM_ORDER, ps2PlayerUrl } from "@/lib/systems";

export const metadata: Metadata = { title: "Emulators" };

export default function EmulatorsPage() {
  return (
    <>
      <h1 className="display pt-10 text-6xl font-extrabold sm:pt-16 sm:text-8xl">Emulators</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        What each system runs on, and where it plays today.
      </p>

      <div className="mt-12 divide-y divide-line border-y border-line">
        {SYSTEM_ORDER.map((id) => {
          const s = SYSTEMS[id];
          const ready = s.status === "ready";
          return (
            <article key={id} className="grid gap-4 py-8 sm:grid-cols-[1.3fr_1fr_16rem] sm:items-center">
              <div className="flex items-center gap-4">
                <span aria-hidden className="h-14 w-2 rounded-full" style={{ background: s.accent }} />
                <div>
                  <h2 className="text-2xl font-bold">{s.name}</h2>
                  <p className="text-muted">{s.year}</p>
                </div>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted">Engine</dt>
                <dd>{s.engine}</dd>
                <dt className="text-muted">Files</dt>
                <dd>{s.extensions.join("  ")}</dd>
                <dt className="text-muted">Status</dt>
                <dd>{ready ? "Plays in the browser" : "Experimental in the browser"}</dd>
              </dl>
              {ready ? (
                <Link
                  href="/play/local"
                  className="justify-self-start rounded-full px-5 py-2.5 font-medium text-white sm:justify-self-end"
                  style={{ background: s.accent }}
                >
                  Play a {s.shortName} file
                </Link>
              ) : (
                <div className="grid gap-2 justify-self-start sm:justify-self-end">
                  <a
                    href={ps2PlayerUrl()}
                    className="justify-self-start rounded-full px-5 py-2.5 font-medium text-white sm:justify-self-end"
                    style={{ background: s.accent }}
                  >
                    Play a {s.shortName} file
                  </a>
                  <p className="max-w-xs text-sm text-muted sm:text-right">{s.note}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
