import Link from "next/link";
import GameCard from "@/components/GameCard";
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
      <section className="flex flex-wrap items-end justify-between gap-6 pt-10 pb-4 sm:pt-16">
        <div>
          <h1 className="display text-6xl font-extrabold sm:text-8xl">Your shelf</h1>
          <p className="mt-4 text-lg text-muted">
            {games.length === 0
              ? "Nothing here yet."
              : `${games.length} ${games.length === 1 ? "game" : "games"} across Game Boy, GBA and PS2.`}
          </p>
        </div>
        <Link
          href="/play/local"
          className="rounded-full bg-ink px-5 py-3 font-medium text-paper transition-transform hover:-translate-y-0.5"
        >
          Play a file from this device
        </Link>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          Couldn’t read your library: {error}
        </p>
      )}

      {SYSTEM_ORDER.map((id) => {
        const system = SYSTEMS[id];
        const list = bySystem[id];
        return (
          <section key={id} className="mt-14" aria-labelledby={`shelf-${id}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`shelf-${id}`} className="text-2xl font-bold">
                {system.name}
              </h2>
              <span className="text-muted">{list.length}</span>
              {system.status !== "ready" && (
                <span className="rounded-full bg-plastic px-2.5 py-0.5 text-xs text-muted">Plays in the desktop app</span>
              )}
            </div>
            <div className="shelf">
              {list.length > 0 ? (
                list.map((game) => <GameCard key={game.id} game={game} />)
              ) : (
                <p className="pb-6 text-muted">{emptyShelfText(id, provider)}</p>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
