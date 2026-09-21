import Link from "next/link";
import GameCard from "@/components/GameCard";
import ShelfRail from "@/components/ShelfRail";
import { getLibrary, type Provider } from "@/lib/library";
import { SYSTEMS, SYSTEM_ORDER, type SystemId } from "@/lib/systems";

export const revalidate = 300;

function emptyShelfText(system: SystemId, provider: Provider) {
  const exts = SYSTEMS[system].extensions.join(", ");
  if (provider === "drive") return `Add ${exts} files to your ${SYSTEMS[system].shortName} folder in Google Drive.`;
  if (provider === "s3") return `Upload ${exts} files to the ${system}/ folder in your bucket.`;
  return `Connect Google Drive or a storage bucket to fill this shelf.`;
}

export default async function LibraryPage() {
  const { games, provider, error } = await getLibrary();
  const bySystem = Object.fromEntries(SYSTEM_ORDER.map((id) => [id, games.filter((g) => g.system === id)]));

  return (
    <>
      <section className="relative pb-16 pt-8 text-center sm:pt-12">
        <div aria-hidden className="glow" />
        <h1 className="display relative mx-auto max-w-3xl text-[40px] sm:text-6xl">
          My collection,
          <br />
          playable anywhere.
        </h1>
        <p className="relative mx-auto mt-6 max-w-md text-base leading-relaxed text-muted">
          Game Boy, GBA and PS2 games from my shelf, running right in the browser. Pair a controller and pick
          something to play.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#shelf-gb"
            className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-paper transition-opacity hover:opacity-85"
          >
            Browse the shelf
          </a>
          <Link
            href="/play/local"
            className="inline-flex h-11 items-center justify-center rounded-full border border-line px-7 text-sm font-medium transition-colors hover:bg-plastic"
          >
            Play a file from this device
          </Link>
        </div>
        <p className="relative mt-6 text-sm text-muted">
          {games.length === 0 ? "Nothing on the shelf yet." : `${games.length} ${games.length === 1 ? "game" : "games"} on the shelf`}
        </p>
      </section>

      {error && (
        <p role="alert" className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          Couldn’t read your library: {error}
        </p>
      )}

      {SYSTEM_ORDER.map((id) => {
        const system = SYSTEMS[id];
        const list = bySystem[id];
        return (
          // Each system gets its own stage; a 3D render of the console can sit above the rail later.
          <section key={id} id={`shelf-${id}`} className="scroll-mt-8 border-t border-line py-16 text-center" aria-labelledby={`shelf-${id}-title`}>
            <p className="text-sm text-muted">
              {system.year}
              {system.status === "experimental" ? ", experimental" : ""}
            </p>
            <h2 id={`shelf-${id}-title`} className="mt-2 text-3xl font-light sm:text-4xl">
              {system.name}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {list.length} {list.length === 1 ? "game" : "games"}
            </p>
            {list.length > 0 ? (
              <ShelfRail label={system.name}>
                {list.map((game) => (
                  <div role="listitem" key={game.id}>
                    <GameCard game={game} />
                  </div>
                ))}
              </ShelfRail>
            ) : (
              <p className="mx-auto mt-8 max-w-md text-muted">{emptyShelfText(id, provider)}</p>
            )}
          </section>
        );
      })}
    </>
  );
}
