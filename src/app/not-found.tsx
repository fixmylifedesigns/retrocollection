import Link from "next/link";

export default function NotFound() {
  return (
    <section className="pt-16">
      <h1 className="display text-[40px] sm:text-6xl">Not on the shelf</h1>
      <p className="mt-4 text-lg text-muted">This game isn’t in your library anymore, or the link is wrong.</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-ink px-5 py-3 font-medium text-paper">
        Back to your shelf
      </Link>
    </section>
  );
}
