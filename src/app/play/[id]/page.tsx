import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EmulatorFrame from "@/components/EmulatorFrame";
import PlayTips from "@/components/PlayTips";
import { formatSize, getGame } from "@/lib/library";
import { SYSTEMS, ps2PlayerUrl } from "@/lib/systems";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await getGame(decodeURIComponent((await params).id));
  return { title: game?.title ?? "Game not found" };
}

export default async function PlayPage({ params }: Props) {
  const id = decodeURIComponent((await params).id);
  const game = await getGame(id);
  if (!game) notFound();
  if (game.system === "ps2") redirect(ps2PlayerUrl(game));
  const system = SYSTEMS[game.system];

  return (
    <section className="pt-8">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        Back to your shelf
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="display text-4xl sm:text-5xl">{game.title}</h1>
        <p className="text-muted">
          {system.shortName}
          {game.size ? `, ${formatSize(game.size)}` : ""}
        </p>
      </div>

      <EmulatorFrame system={game.system} romUrl={`/api/rom/${encodeURIComponent(game.id)}`} saveName={game.title} />
      <PlayTips />
    </section>
  );
}
